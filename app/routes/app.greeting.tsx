import "app/Component/greeting.css";
import { authenticate } from "app/shopify.server";
import { LoaderFunctionArgs } from "react-router";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);

  return null;
};

export default function ThanksPage() {

  return (
    <div className="setup-page">
      {/* TOP SECTION */}
      <div className="setup-main">
        {/* LEFT CONTENT */}
        <div className="setup-left">
          <div className="status-icon">Thanks for Join Our App</div>

          <h1>Setup complete</h1>

          <p className="primary-text">
            Thank you for installing the app and granting the required
            permissions.
          </p>

          <p className="secondary-text">
            Lorem ipsum dolor sit amet consectetur adipisicing elit. Ipsam iusto, dolorem sint assumenda eligendi voluptates eaque dolorum odit doloremque dignissimos magni perspiciatis, cumque officiis aliquid incidunt, quibusdam quasi autem animi.
            You’re all set. You can now continue and start using the app
            without any further configuration.
          </p>
        </div>
      </div>

      {/* RIGHT ACTION */}
        {/* <div className="setup-right">
          <button
            className="primary-btn"
            onClick={() => navigate("/app")}
          >
            Continue to app
          </button>
        </div> */}

      {/* OPTIONAL BOTTOM INFO SECTION */}
      <div className="setup-footer">
        <p>
          If you need help later, you can always manage settings or contact
          support from inside the app.
        </p>
      </div>
    </div>
  );
}
