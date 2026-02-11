import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

/**
 * POST /api/ecommerce/orders/[id]/fulfillment
 *
 * Creates or updates a fulfillment with tracking info on Shopify,
 * then syncs the result back to the local database.
 *
 * Body: { tracking_number, tracking_url?, tracking_company?, notify_customer? }
 */
export async function POST(request, { params }) {
  const supabase = await createClient();
  const admin = createAdminClient();
  const { id } = await params;

  // Authenticate
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Parse body
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { tracking_number, tracking_url, tracking_company, notify_customer } = body;

  if (!tracking_number) {
    return NextResponse.json({ error: "tracking_number is required" }, { status: 400 });
  }

  // Get the order from local DB
  const { data: order, error: orderError } = await admin
    .from("shopify_orders")
    .select("*")
    .eq("id", id)
    .single();

  if (orderError || !order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  // Get Shopify connection for this shop
  const { data: connection, error: connError } = await admin
    .from("shopify_connections")
    .select("shop_domain, access_token")
    .eq("user_id", user.id)
    .single();

  if (connError || !connection) {
    return NextResponse.json({ error: "Shopify not connected" }, { status: 400 });
  }

  // Verify this order belongs to the user's shop
  if (order.shop_domain !== connection.shop_domain) {
    return NextResponse.json({ error: "Order does not belong to your shop" }, { status: 403 });
  }

  const { shop_domain, access_token } = connection;
  const shopifyOrderId = order.shopify_id;
  const existingFulfillments = order.fulfillments || [];
  const trackingInfo = {
    number: tracking_number,
    url: tracking_url || "",
    company: tracking_company || "",
  };

  try {
    let updatedFulfillments;

    // Check if order already has a fulfillment with tracking — update it
    const existingWithTracking = existingFulfillments.find((f) => f.id);

    if (existingWithTracking) {
      // Update tracking on existing fulfillment
      const updateRes = await fetch(
        `https://${shop_domain}/admin/api/2024-01/fulfillments/${existingWithTracking.id}/update_tracking.json`,
        {
          method: "PUT",
          headers: {
            "X-Shopify-Access-Token": access_token,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            fulfillment: {
              tracking_info: trackingInfo,
              notify_customer: notify_customer !== false,
            },
          }),
        }
      );

      if (!updateRes.ok) {
        const errData = await updateRes.json().catch(() => ({}));
        console.error("[Fulfillment] Update tracking failed:", errData);
        return NextResponse.json(
          { error: "Failed to update tracking on Shopify", details: errData },
          { status: updateRes.status }
        );
      }

      const updateData = await updateRes.json();
      const updatedF = updateData.fulfillment;

      // Merge updated fulfillment into existing array
      updatedFulfillments = existingFulfillments.map((f) =>
        f.id === existingWithTracking.id
          ? {
              ...f,
              tracking_number: updatedF.tracking_number || tracking_number,
              tracking_url: updatedF.tracking_url || tracking_url || "",
              tracking_company: updatedF.tracking_company || tracking_company || "",
              updated_at: updatedF.updated_at || new Date().toISOString(),
            }
          : f
      );
    } else {
      // No existing fulfillment — create one via fulfillment orders
      // Step 1: Get fulfillment orders for this Shopify order
      const foRes = await fetch(
        `https://${shop_domain}/admin/api/2024-01/orders/${shopifyOrderId}/fulfillment_orders.json`,
        {
          headers: {
            "X-Shopify-Access-Token": access_token,
            "Content-Type": "application/json",
          },
        }
      );

      if (!foRes.ok) {
        const errData = await foRes.json().catch(() => ({}));
        console.error("[Fulfillment] Get fulfillment orders failed:", errData);
        return NextResponse.json(
          { error: "Failed to get fulfillment orders from Shopify", details: errData },
          { status: foRes.status }
        );
      }

      const foData = await foRes.json();
      const fulfillmentOrders = foData.fulfillment_orders || [];

      // Find open/in-progress fulfillment orders
      const openFOs = fulfillmentOrders.filter(
        (fo) => fo.status === "open" || fo.status === "in_progress"
      );

      if (openFOs.length === 0) {
        // All items already fulfilled — try to find any fulfillment order to update
        // Fall back to saving locally only
        updatedFulfillments = [
          ...existingFulfillments,
          {
            id: null,
            status: "success",
            tracking_number,
            tracking_url: tracking_url || "",
            tracking_company: tracking_company || "",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ];
      } else {
        // Step 2: Create fulfillment
        const lineItemsByFO = openFOs.map((fo) => ({
          fulfillment_order_id: fo.id,
        }));

        const createRes = await fetch(
          `https://${shop_domain}/admin/api/2024-01/fulfillments.json`,
          {
            method: "POST",
            headers: {
              "X-Shopify-Access-Token": access_token,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              fulfillment: {
                line_items_by_fulfillment_order: lineItemsByFO,
                tracking_info: trackingInfo,
                notify_customer: notify_customer !== false,
              },
            }),
          }
        );

        if (!createRes.ok) {
          const errData = await createRes.json().catch(() => ({}));
          console.error("[Fulfillment] Create fulfillment failed:", errData);
          return NextResponse.json(
            { error: "Failed to create fulfillment on Shopify", details: errData },
            { status: createRes.status }
          );
        }

        const createData = await createRes.json();
        const newF = createData.fulfillment;

        updatedFulfillments = [
          ...existingFulfillments,
          {
            id: newF.id,
            status: newF.status || "success",
            tracking_number: newF.tracking_number || tracking_number,
            tracking_url: newF.tracking_url || tracking_url || "",
            tracking_company: newF.tracking_company || tracking_company || "",
            shipment_status: newF.shipment_status || null,
            created_at: newF.created_at || new Date().toISOString(),
            updated_at: newF.updated_at || new Date().toISOString(),
          },
        ];
      }
    }

    // Update local DB with new fulfillment data
    const { error: updateError } = await admin
      .from("shopify_orders")
      .update({
        fulfillments: updatedFulfillments,
        fulfillment_status: "fulfilled",
        synced_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (updateError) {
      console.error("[Fulfillment] DB update failed:", updateError.message);
      return NextResponse.json(
        { error: "Shopify updated but local sync failed" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      fulfillments: updatedFulfillments,
    });
  } catch (err) {
    console.error("[Fulfillment] Error:", err.message);
    return NextResponse.json(
      { error: "Internal server error", message: err.message },
      { status: 500 }
    );
  }
}
