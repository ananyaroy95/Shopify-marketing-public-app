import "app/Component/greeting.css";
import { useNavigate } from "react-router";

export default function GreetingPage() {
  const navigate = useNavigate();

  return (
    <div className="setup-page">
      <div className="setup-main">
        <div className="setuped-content">
          <h1>🎉 Setup Completed!</h1>
          <p className="primary-text">Thank you for installing Adbuffs Onboard and granting the necessary permissions. The app will now securely access the data required to operate and help you get the best results from your campaigns.</p>
          <p className="primary-text">You’re ready to take full advantage of everything this app has to offer. Let’s get started!</p>
          <p className="info-text">
            <i>If you need help later, you can always manage settings or contact support from inside the app.</i>
          </p>
        </div>
        <div className="backToAppBtn">
          <button className="primary-btn" onClick={() => navigate("/app?reset=true")}>Continue to App</button>
        </div>
      </div>
    </div>
  );
}
