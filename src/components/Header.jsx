import logo from '../assets/growsin-logo.png'

export default function Header({ progress = 0, onBack, user, onLogout }) {
  return (
    <header className="bar">
      <div className="bar-in">
        {onBack && (
          <button type="button" className="hb-back" onClick={onBack} aria-label="Back">←</button>
        )}
        <img className="logo-img" src={logo} alt="Growsin" width="135" height="50" />
        <span className="bar-div" aria-hidden="true" />
        <div className="brand">
          <b>Client Onboarding</b>
          <span>Investment Advisory · Murali Krishna Sivvala · SEBI RIA INA000021261</span>
        </div>
        <span className="bar-sp" />
        {user && (
          <div className="bar-user">
            <span>{user.name}</span>
            <button type="button" className="link-btn" onClick={onLogout}>Log out</button>
          </div>
        )}
      </div>
      <div className="progress" aria-hidden="true"><span style={{ width: `${Math.round(progress)}%` }} /></div>
    </header>
  )
}
