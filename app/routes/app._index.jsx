import { useEffect } from "react";
import { useFetcher } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  await authenticate.admin(request);
  return null;
};

export const action = async ({ request }) => {
  const { admin } = await authenticate.admin(request);

  const functionsResponse = await admin.graphql(`
    query {
      shopifyFunctions(first: 20) {
        nodes {
          id
          title
          apiType
        }
      }
    }
  `);

  const functionsJson = await functionsResponse.json();

  const freeGiftFunction = functionsJson.data.shopifyFunctions.nodes.find(
    (fn) => fn.title === "free-gift-discount"
  );

  if (!freeGiftFunction) {
    return {
      success: false,
      message: "Free gift function was not found.",
    };
  }

  const discountResponse = await admin.graphql(
    `
      mutation CreateFreeGiftDiscount($functionId: String!) {
        discountAutomaticAppCreate(
          automaticAppDiscount: {
            title: "Free Gift Discount"
            functionId: $functionId
            startsAt: "2026-01-01T00:00:00Z"
            discountClasses: [PRODUCT]
            combinesWith: {
              productDiscounts: true
              orderDiscounts: true
              shippingDiscounts: true
            }
          }
        ) {
          automaticAppDiscount {
            discountId
            title
            status
          }
          userErrors {
            field
            message
          }
        }
      }
    `,
    {
      variables: {
        functionId: freeGiftFunction.id,
      },
    }
  );

  const discountJson = await discountResponse.json();
  const result = discountJson.data.discountAutomaticAppCreate;

  if (result.userErrors.length) {
    return {
      success: false,
      message: result.userErrors.map((error) => error.message).join(", "),
    };
  }

  return {
    success: true,
    discount: result.automaticAppDiscount,
    message: "Free Gift Discount created successfully.",
  };
};

export default function Index() {
  const fetcher = useFetcher();
  const shopify = useAppBridge();

  const isLoading = fetcher.state === "submitting";

  useEffect(() => {
    if (fetcher.data?.success) {
      shopify.toast.show("Free Gift Discount created");
    }

    if (fetcher.data?.success === false) {
      shopify.toast.show(fetcher.data.message || "Something went wrong", {
        isError: true,
      });
    }
  }, [fetcher.data, shopify]);

  const createDiscount = () => {
    fetcher.submit({}, { method: "POST" });
  };

  return (
    <s-page heading="Free Gift Discount">
      <s-section heading="Create automatic discount">
        <s-paragraph>
          Click the button below to create the automatic app discount for this store.
        </s-paragraph>

        <s-button onClick={createDiscount} {...(isLoading ? { loading: true } : {})}>
          Create Free Gift Discount
        </s-button>

        {fetcher.data?.message && (
          <s-box padding="base" borderWidth="base" borderRadius="base">
            <s-paragraph>{fetcher.data.message}</s-paragraph>
          </s-box>
        )}

        {fetcher.data?.discount && (
          <s-box padding="base" borderWidth="base" borderRadius="base">
            <pre style={{ margin: 0 }}>
              <code>{JSON.stringify(fetcher.data.discount, null, 2)}</code>
            </pre>
          </s-box>
        )}
      </s-section>
    </s-page>
  );
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};