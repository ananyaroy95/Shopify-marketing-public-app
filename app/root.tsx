import { Links, Meta, Outlet, Scripts, ScrollRestoration } from "react-router";
import checklistCss from "./style/checklist.css?inline";
import customCss from "./style/custom.css?inline";

const appStyles = `${checklistCss}\n${customCss}`;

export default function App() {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <link rel="preconnect" href="https://cdn.shopify.com/" />
        <link
          rel="stylesheet"
          href="https://cdn.shopify.com/static/fonts/inter/v4/styles.css"
        />
        <Meta />
        <Links />
      </head>
      <body>
        {/* Keep app CSS in the body. App Bridge injects tags into <head>
            before hydration, and React Router then removes stylesheet <link>s. */}
        <style dangerouslySetInnerHTML={{ __html: appStyles }} />
        <Outlet />
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}
