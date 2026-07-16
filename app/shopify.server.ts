import "@shopify/shopify-app-react-router/adapters/node";
import {
  storeSession,
  loadSession,
  deleteSession,
  deleteSessions,
  findSessionsByShop,
} from "./utils/dbSessionStorage.server";

import {
  ApiVersion,
  AppDistribution,
  shopifyApp,
  DeliveryMethod,
} from "@shopify/shopify-app-react-router/server";
import { saveShop } from "./utils/dbShopStorage.server";

const scopes =
  process.env.SCOPES?.split(",")
    .map((scope) => scope.trim())
    .filter(Boolean) ?? ["read_orders"];

const shopify = shopifyApp({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecretKey: process.env.SHOPIFY_API_SECRET || "", 
  apiVersion: ApiVersion.April26,
  scopes,
  appUrl: process.env.SHOPIFY_APP_URL || "",
  authPathPrefix: "/auth",

  webhooks: {
    APP_UNINSTALLED: {
      deliveryMethod: DeliveryMethod.Http,
      callbackUrl: "/webhooks/app/uninstalled",
    },
  },

  sessionStorage: {
    storeSession,
    loadSession,
    deleteSession,
    deleteSessions,
    findSessionsByShop,
  },

  hooks: {
    afterAuth: async ({ session }) => {
      const shop = session.shop;
      const accessToken = session.accessToken;

      if (!shop || !accessToken) return;
      await saveShop(shop, accessToken);
    },
  },

  distribution: AppDistribution.SingleMerchant,
});

export default shopify;
export const apiVersion = ApiVersion.April26;
export const addDocumentResponseHeaders = shopify.addDocumentResponseHeaders;
export const authenticate = shopify.authenticate;
export const unauthenticated = shopify.unauthenticated;
export const login = shopify.login;
export const registerWebhooks = shopify.registerWebhooks;
