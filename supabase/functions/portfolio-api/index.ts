import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { validateTelegramInitData, getTelegramUser } from "./telegram.ts";
import { buildInlinePortfolioResult } from "./sharePrepared.ts";
import { portfolioStartAppLink } from "./miniAppLink.ts";
import { purgeExpiredShareTemp, shareTempStoragePath } from "./shareTemp.ts";
import {
  verifyBotApiToken,
  isTrustedMediaUrl,
  sanitizeSocialLinks,
  sanitizeHttpsMediaUrl,
} from "./security.ts";
import { buildCorsHeaders } from "./cors.ts";
import { consumeRateLimit } from "./rateLimit.ts";
import {
  clampTheme,
  sanitizeProfileUpdates,
  sanitizeSectionInput,
  sanitizeTechStackItem,
} from "./inputLimits.ts";

function getAdminClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}

async function requireAuth(req: Request) {
  const initData = req.headers.get("X-Telegram-Init-Data");
  if (!initData) return null;

  const botToken = Deno.env.get("BOT_TOKEN");
  if (!botToken || !(await validateTelegramInitData(initData, botToken))) return null;

  const user = getTelegramUser(initData);
  if (!user) return null;

  return user;
}

Deno.serve(async (req: Request) => {
  const corsHeaders = buildCorsHeaders(req);

  const json = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  const error = (message: string, status = 400) => json({ error: message }, status);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const path = url.pathname.replace(/^\/portfolio-api/, "");

  try {
    const supabase = getAdminClient();

    if (path === "/me" && req.method === "GET") {
      const user = await requireAuth(req);
      if (!user) return error("Unauthorized", 401);

      const { data, error: dbError } = await supabase
        .from("profiles")
        .select("*")
        .eq("telegram_id", user.id)
        .single();

      if (dbError) return json({ profile: null, techStack: [], sections: [] });

      const { data: techStack } = await supabase
        .from("tech_stack")
        .select("*")
        .eq("profile_id", data.id)
        .order("sort_order");

      const { data: sections } = await supabase
        .from("portfolio_sections")
        .select("*")
        .eq("profile_id", data.id)
        .order("sort_order");

      return json({ profile: data, techStack: techStack || [], sections: sections || [] });
    }

    if (path === "/profile" && req.method === "POST") {
      const user = await requireAuth(req);
      if (!user) return error("Unauthorized", 401);

      const body = await req.json();
      const username = String(body.username || "").toLowerCase().replace(/[^a-z0-9_]/g, "");
      if (username.length < 3) return error("Username too short");

      const { data: existing } = await supabase
        .from("profiles")
        .select("id")
        .eq("telegram_id", user.id)
        .single();

      if (existing) return error("Profile already exists", 409);

      const { data: taken } = await supabase
        .from("profiles")
        .select("id")
        .eq("username", username)
        .single();

      if (taken) return error("Username taken", 409);

      const { data, error: dbError } = await supabase
        .from("profiles")
        .insert({
          telegram_id: user.id,
          username,
          display_name: body.display_name || user.first_name,
          avatar_url: body.avatar_url || user.photo_url || null,
          activity_status: "online",
          theme: { primaryColor: "#3B82F6", cardStyle: "horizontal", darkMode: true },
          social_links: {},
          is_public: true,
        })
        .select()
        .single();

      if (dbError) return error(dbError.message, 500);
      return json({ profile: data }, 201);
    }

    if (path === "/profile" && req.method === "PUT") {
      const user = await requireAuth(req);
      if (!user) return error("Unauthorized", 401);

      const body = await req.json();
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, is_supporter")
        .eq("telegram_id", user.id)
        .single();

      if (!profile) return error("Profile not found", 404);

      const updates: Record<string, unknown> = sanitizeProfileUpdates(body);
      if ("theme" in body) {
        const theme = clampTheme(body.theme);
        if (!profile.is_supporter) {
          delete theme.showSupporterBadge;
          delete theme.supporterBadgePlacement;
        }
        updates.theme = theme;
      }
      if ("social_links" in body) {
        updates.social_links = sanitizeSocialLinks(body.social_links);
      }
      if ("avatar_url" in body) {
        updates.avatar_url = body.avatar_url
          ? sanitizeHttpsMediaUrl(body.avatar_url)
          : null;
      }
      if ("header_image_url" in body) {
        updates.header_image_url = body.header_image_url
          ? sanitizeHttpsMediaUrl(body.header_image_url)
          : null;
      }

      const { data, error: dbError } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", profile.id)
        .select()
        .single();

      if (dbError) return error(dbError.message, 500);
      return json({ profile: data });
    }

    if (path === "/tech-stack" && req.method === "PUT") {
      const user = await requireAuth(req);
      if (!user) return error("Unauthorized", 401);

      const body = await req.json();
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("telegram_id", user.id)
        .single();

      if (!profile) return error("Profile not found", 404);

      await supabase.from("tech_stack").delete().eq("profile_id", profile.id);

      const rawItems = Array.isArray(body.items) ? body.items.slice(0, 60) : [];
      const items = rawItems.map((item: Record<string, unknown>, i: number) => {
        const row = sanitizeTechStackItem(item, i);
        const badgeUrl = typeof item.badge_url === "string" ? sanitizeHttpsMediaUrl(item.badge_url) : null;
        return {
          profile_id: profile.id,
          ...row,
          badge_url: badgeUrl,
        };
      });

      if (items.length > 0) {
        const { error: dbError } = await supabase.from("tech_stack").insert(items);
        if (dbError) return error(dbError.message, 500);
      }

      return json({ ok: true });
    }

    if (path === "/sections" && req.method === "PUT") {
      const user = await requireAuth(req);
      if (!user) return error("Unauthorized", 401);

      const body = await req.json();
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("telegram_id", user.id)
        .single();

      if (!profile) return error("Profile not found", 404);

      await supabase.from("portfolio_sections").delete().eq("profile_id", profile.id);

      const rawSections = Array.isArray(body.sections) ? body.sections.slice(0, 40) : [];
      const sections = rawSections.map((s: Record<string, unknown>, i: number) => ({
        profile_id: profile.id,
        ...sanitizeSectionInput(s, i),
      }));

      if (sections.length > 0) {
        const { error: dbError } = await supabase.from("portfolio_sections").insert(sections);
        if (dbError) return error(dbError.message, 500);
      }

      return json({ ok: true });
    }

    if (path === "/upload" && req.method === "POST") {
      const user = await requireAuth(req);
      if (!user) return error("Unauthorized", 401);

      const uploadLimit = await consumeRateLimit(supabase, "upload", String(user.id));
      if (!uploadLimit.ok) {
        return error(`Too many uploads. Try again in ${uploadLimit.retryAfterSec}s`, 429);
      }

      const body = await req.json();
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("telegram_id", user.id)
        .single();

      if (!profile) return error("Profile not found", 404);

      const { file, filename, folder } = body;
      if (!file || !filename) return error("Missing file data");

      const allowedFolders = new Set(["uploads", "banners", "cards", "share-temp", "avatars"]);
      const folderName = typeof folder === "string" && folder ? folder : "uploads";
      if (!allowedFolders.has(folderName)) return error("Invalid folder");

      const ext = filename.split(".").pop()?.toLowerCase() || "jpg";
      const allowed = ["jpg", "jpeg", "png", "webp", "gif"];
      const contentTypes: Record<string, string> = {
        jpg: "image/jpeg",
        jpeg: "image/jpeg",
        png: "image/png",
        webp: "image/webp",
        gif: "image/gif",
      };
      if (!allowed.includes(ext)) return error("Invalid file type");

      const binary = Uint8Array.from(atob(file), (c) => c.charCodeAt(0));
      if (binary.length > 5 * 1024 * 1024) return error("File too large");

      const fileExt = ext === "jpeg" ? "jpg" : ext;
      const storagePath = folderName === "share-temp"
        ? shareTempStoragePath(profile.id, fileExt)
        : `${folderName}/${profile.id}/${crypto.randomUUID()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("portfolio-images")
        .upload(storagePath, binary, { contentType: contentTypes[ext] || "application/octet-stream", upsert: true });

      if (uploadError) return error(uploadError.message, 500);

      if (folderName === "share-temp") {
        await purgeExpiredShareTemp(supabase, profile.id);
      }

      const { data: urlData } = supabase.storage.from("portfolio-images").getPublicUrl(storagePath);
      return json({
        url: urlData.publicUrl,
        storage_path: storagePath,
        expires_in_seconds: folderName === "share-temp" ? 600 : undefined,
      });
    }

    if (path === "/send-card" && req.method === "POST") {
      const user = await requireAuth(req);
      if (!user) return error("Unauthorized", 401);

      const sendLimit = await consumeRateLimit(supabase, "send-card", String(user.id));
      if (!sendLimit.ok) {
        return error(`Too many requests. Try again in ${sendLimit.retryAfterSec}s`, 429);
      }

      const body = await req.json();
      const imageUrl = body.image_url as string | undefined;
      if (!imageUrl) return error("Missing image_url");
      if (!isTrustedMediaUrl(imageUrl)) return error("Invalid image_url");

      const { data: profile } = await supabase
        .from("profiles")
        .select("username, display_name, theme")
        .eq("telegram_id", user.id)
        .single();

      if (!profile) return error("Profile not found", 404);

      const botToken = Deno.env.get("BOT_TOKEN");
      if (!botToken) return error("Bot not configured", 500);

      const botUsername = Deno.env.get("BOT_USERNAME") || "your_bot_username";
      const webAppUrl = Deno.env.get("WEB_APP_URL") || "https://your-app.example.com";
      const portfolioUrl = `${webAppUrl}/u/${profile.username}`;
      const startLink = portfolioStartAppLink(botUsername, profile.username as string);
      const caption = [
        `📋 ${profile.display_name || profile.username}`,
        "",
        `🔗 ${startLink}`,
        "",
        "Открой мини-апп для полного README",
      ].join("\n");

      const isGif = imageUrl.toLowerCase().includes(".gif");
      const tgMethod = isGif ? "sendAnimation" : "sendPhoto";
      const mediaField = isGif ? "animation" : "photo";

      const tgRes = await fetch(`https://api.telegram.org/bot${botToken}/${tgMethod}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: user.id,
          [mediaField]: imageUrl,
          caption,
          reply_markup: {
            inline_keyboard: [[
              { text: "Открыть портфолио", web_app: { url: portfolioUrl } },
            ]],
          },
        }),
      });

      const tgData = await tgRes.json();
      if (!tgData.ok) {
        return error(typeof tgData.description === "string" ? tgData.description : "Telegram send failed", 500);
      }

      const theme = {
        ...(typeof profile.theme === "object" && profile.theme ? profile.theme : {}),
        shareCardUrl: imageUrl,
      };

      const { error: themeError } = await supabase
        .from("profiles")
        .update({ theme })
        .eq("telegram_id", user.id);

      if (themeError) {
        console.error("shareCardUrl theme update:", themeError.message);
      }

      const { error: shareUrlError } = await supabase
        .from("profiles")
        .update({ share_card_url: imageUrl })
        .eq("telegram_id", user.id);

      if (shareUrlError) {
        console.error("share_card_url update:", shareUrlError.message);
      }

      return json({ ok: true });
    }

    if (path === "/prepare-share" && req.method === "POST") {
      const user = await requireAuth(req);
      if (!user) return error("Unauthorized", 401);

      const shareLimit = await consumeRateLimit(supabase, "prepare-share", String(user.id));
      if (!shareLimit.ok) {
        return error(`Too many share attempts. Try again in ${shareLimit.retryAfterSec}s`, 429);
      }

      const body = await req.json();
      const requestedUsername = String(body.username || "")
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, "");

      const profileFields = "username, display_name, bio, theme, avatar_url, header_image_url, is_public, telegram_id";

      const { data: profile } = await supabase
        .from("profiles")
        .select(profileFields)
        .eq("telegram_id", user.id)
        .maybeSingle();

      if (!profile) return error("Profile not found", 404);

      if (requestedUsername.length >= 3 && requestedUsername !== profile.username) {
        return error("You can only share your own portfolio", 403);
      }

      const botToken = Deno.env.get("BOT_TOKEN");
      if (!botToken) return error("Bot not configured", 500);

      const botUsername = Deno.env.get("BOT_USERNAME") || "your_bot_username";
      const webAppUrl = Deno.env.get("WEB_APP_URL") || "https://your-app.example.com";

      const rawImageUrl = typeof body.image_url === "string" ? body.image_url.trim() : "";
      if (!rawImageUrl || !isTrustedMediaUrl(rawImageUrl)) {
        return error("Missing share image. Generate the card first.", 400);
      }

      const thumbImageUrl = typeof body.thumb_url === "string" ? body.thumb_url.trim() : rawImageUrl;
      if (!isTrustedMediaUrl(thumbImageUrl)) {
        return error("Invalid thumb image.", 400);
      }
      const photoWidth = Number(body.photo_width) || 420;
      const photoHeight = Number(body.photo_height) || 640;
      const thumbWidth = Number(body.thumb_width) || 320;
      const thumbHeight = Number(body.thumb_height) || Math.round(photoHeight * (320 / photoWidth));

      const ownerId = profile.telegram_id as number | undefined;
      if (ownerId === user.id) {
        const theme = {
          ...(typeof profile.theme === "object" && profile.theme ? profile.theme : {}),
          shareCardUrl: rawImageUrl,
        };
        await supabase.from("profiles").update({ theme }).eq("telegram_id", user.id);
        profile.theme = theme;
      }

      const shareProfile = profile as Parameters<typeof buildInlinePortfolioResult>[0];
      const resultId = `portfolio-${shareProfile.username}-${Date.now()}`;
      const bodyOverrideProvided = ownerId === user.id && body.share_message !== undefined;
      const bodyOverride = bodyOverrideProvided ? body.share_message : undefined;
      const shareLocale = body.share_locale;
      const includeDirectLinkProvided = body.share_include_direct_link !== undefined;
      const includeDirectLink = includeDirectLinkProvided ? body.share_include_direct_link : undefined;
      const result = buildInlinePortfolioResult(
        shareProfile,
        botUsername,
        webAppUrl,
        {
          photoUrl: rawImageUrl,
          thumbUrl: thumbImageUrl,
          photoWidth,
          photoHeight,
          thumbWidth,
          thumbHeight,
        },
        resultId,
        bodyOverride,
        bodyOverrideProvided,
        shareLocale,
        includeDirectLink,
        includeDirectLinkProvided,
      );

      const tgRes = await fetch(`https://api.telegram.org/bot${botToken}/savePreparedInlineMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: user.id,
          allow_user_chats: true,
          allow_bot_chats: true,
          allow_group_chats: true,
          allow_channel_chats: true,
          result,
        }),
      });

      const tgData = await tgRes.json();
      if (!tgData.ok || !tgData.result?.id) {
        const description = typeof tgData.description === "string"
          ? tgData.description
          : "Telegram share failed";
        return error(description, 502);
      }

      const { data: ownerProfile } = await supabase
        .from("profiles")
        .select("id")
        .eq("telegram_id", user.id)
        .maybeSingle();
      if (ownerProfile?.id) {
        await purgeExpiredShareTemp(supabase, ownerProfile.id);
      }

      return json({ prepared_message_id: tgData.result.id });
    }

    if (path === "/bot/grant-supporter" && req.method === "POST") {
      if (!verifyBotApiToken(req)) return error("Unauthorized", 401);

      const body = await req.json();
      const telegramId = Number(body.telegram_id);
      if (!telegramId) return error("Missing telegram_id");

      const { data: row } = await supabase
        .from("profiles")
        .select("theme")
        .eq("telegram_id", telegramId)
        .maybeSingle();

      if (!row) return error("Profile not found", 404);

      const prevTheme =
        typeof row.theme === "object" && row.theme ? row.theme as Record<string, unknown> : {};
      const theme = {
        ...prevTheme,
        showSupporterBadge: true,
        supporterBadgePlacement:
          prevTheme.supporterBadgePlacement === "status" ? "status" : "username",
      };

      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          is_supporter: true,
          supporter_since: new Date().toISOString(),
          theme,
        })
        .eq("telegram_id", telegramId);

      if (updateError) return error(updateError.message, 500);
      return json({ ok: true });
    }

    if (path === "/bot/persist-share-image" && req.method === "POST") {
      if (!verifyBotApiToken(req)) return error("Unauthorized", 401);

      const body = await req.json();
      const telegramId = Number(body.telegram_id);
      const imageUrl = typeof body.image_url === "string" ? body.image_url.trim() : "";
      if (!telegramId || !imageUrl) return error("Missing telegram_id or image_url");
      if (!isTrustedMediaUrl(imageUrl)) return error("Invalid image_url");

      const { data: row } = await supabase
        .from("profiles")
        .select("theme")
        .eq("telegram_id", telegramId)
        .maybeSingle();

      if (!row) return error("Profile not found", 404);

      const theme = {
        ...(typeof row.theme === "object" && row.theme ? row.theme : {}),
        shareCardUrl: imageUrl,
      };

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ theme })
        .eq("telegram_id", telegramId);

      if (updateError) return error(updateError.message, 500);
      return json({ ok: true });
    }

    if (path === "/bot/share-payload" && req.method === "GET") {
      if (!verifyBotApiToken(req)) return error("Unauthorized", 401);

      const username = url.searchParams.get("username")?.toLowerCase();
      const telegramId = url.searchParams.get("telegram_id");

      let dbQuery = supabase
        .from("profiles")
        .select("username, display_name, bio, theme, avatar_url, header_image_url, is_public");

      if (username) {
        dbQuery = dbQuery.eq("username", username).eq("is_public", true);
      } else if (telegramId) {
        dbQuery = dbQuery.eq("telegram_id", parseInt(telegramId, 10));
      } else {
        return error("Missing username or telegram_id");
      }

      const { data, error: dbError } = await dbQuery.single();
      if (dbError) return json({ profile: null });
      return json({ profile: data });
    }

    if (path === "/bot/profile" && req.method === "GET") {
      if (!verifyBotApiToken(req)) return error("Unauthorized", 401);

      const telegramId = url.searchParams.get("telegram_id");
      if (!telegramId) return error("Missing telegram_id");

      const { data, error: dbError } = await supabase
        .from("profiles")
        .select("username, display_name, bio, theme, avatar_url, header_image_url, share_card_url, is_public")
        .eq("telegram_id", parseInt(telegramId, 10))
        .single();

      if (dbError) return json({ profile: null });
      return json({ profile: data });
    }

    if (path === "/bot/public-profile" && req.method === "GET") {
      if (!verifyBotApiToken(req)) return error("Unauthorized", 401);

      const username = url.searchParams.get("username")?.toLowerCase();
      if (!username) return error("Missing username");

      const { data, error: dbError } = await supabase
        .from("profiles")
        .select("display_name, bio, username")
        .eq("username", username)
        .eq("is_public", true)
        .single();

      if (dbError) return json({ profile: null });
      return json({ profile: data });
    }

    return error("Not found", 404);
  } catch (e) {
    return error(e instanceof Error ? e.message : "Server error", 500);
  }
});
