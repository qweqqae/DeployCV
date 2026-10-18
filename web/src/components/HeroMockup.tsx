import { ActivityStatus } from './ActivityStatus';

export function HeroMockup() {
  return (
    <div className="hero-mockup">
      <div className="hero-mockup__glow" />
      <div className="hero-mockup__card">
        <div className="hero-mockup__cover" />
        <div className="hero-mockup__body">
          <div className="hero-mockup__avatar">I</div>
          <div className="hero-mockup__info">
            <div className="hero-mockup__name">Your Name</div>
            <div className="hero-mockup__handle">@username</div>
            <ActivityStatus status="coding" message="Building something cool" size="sm" />
          </div>
        </div>
        <div className="hero-mockup__badges">
          <span className="hero-mockup__badge">React</span>
          <span className="hero-mockup__badge">TypeScript</span>
          <span className="hero-mockup__badge">Node.js</span>
        </div>
      </div>
      <div className="hero-mockup__float hero-mockup__float--1">+24%</div>
      <div className="hero-mockup__float hero-mockup__float--2">Live</div>
    </div>
  );
}
