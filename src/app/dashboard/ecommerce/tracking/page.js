"use client";

import { useState, useEffect } from "react";
import styles from "../page.module.css";

export default function TrackingPage() {
  const [connection, setConnection] = useState(null);
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [trackingResult, setTrackingResult] = useState(null);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        // Fetch connection
        const connRes = await fetch("/api/ecommerce/shopify");
        if (connRes.ok) {
          const connData = await connRes.json();
          setConnection(connData.connection);
        }
      } catch {
        setError("Failed to load data");
      }
      setLoading(false);
    }
    loadData();
  }, []);

  async function handleTrack(e) {
    e.preventDefault();
    if (!trackingNumber.trim()) return;

    setSearching(true);
    setError("");
    setTrackingResult(null);

    // Placeholder - implement tracking API
    setTimeout(() => {
      setTrackingResult({
        number: trackingNumber,
        carrier: "Auto-detected",
        status: "In Transit",
        estimatedDelivery: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toLocaleDateString(),
        events: [
          { date: new Date().toLocaleDateString(), time: "10:30 AM", location: "Distribution Center", status: "Package in transit" },
          { date: new Date(Date.now() - 24 * 60 * 60 * 1000).toLocaleDateString(), time: "2:15 PM", location: "Origin Facility", status: "Package picked up" },
        ],
      });
      setSearching(false);
    }, 1000);
  }

  if (loading) {
    return <p className={styles.loading}>Loading...</p>;
  }

  return (
    <>
      <h1 className={styles.heading}>Tracking</h1>
      <p className={styles.subheading}>Track shipments and deliveries.</p>

      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.trackingSection}>
        <div className={styles.trackingCard}>
          <div className={styles.trackingHeader}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            <h2 className={styles.trackingTitle}>Track a Package</h2>
          </div>

          <form className={styles.trackingForm} onSubmit={handleTrack}>
            <div className={styles.trackingInputGroup}>
              <input
                type="text"
                className={styles.trackingInput}
                placeholder="Enter tracking number..."
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
              />
              <button
                type="submit"
                className={styles.trackingBtn}
                disabled={searching || !trackingNumber.trim()}
              >
                {searching ? "Tracking..." : "Track"}
              </button>
            </div>
          </form>

          {trackingResult && (
            <div className={styles.trackingResult}>
              <div className={styles.trackingResultHeader}>
                <div className={styles.trackingResultInfo}>
                  <span className={styles.trackingResultNumber}>{trackingResult.number}</span>
                  <span className={styles.trackingResultCarrier}>{trackingResult.carrier}</span>
                </div>
                <span className={`${styles.trackingResultStatus} ${styles.statusInTransit}`}>
                  {trackingResult.status}
                </span>
              </div>

              <div className={styles.trackingResultEta}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                Estimated delivery: {trackingResult.estimatedDelivery}
              </div>

              <div className={styles.trackingTimeline}>
                {trackingResult.events.map((event, i) => (
                  <div key={i} className={styles.trackingEvent}>
                    <div className={styles.trackingEventDot}></div>
                    <div className={styles.trackingEventContent}>
                      <div className={styles.trackingEventStatus}>{event.status}</div>
                      <div className={styles.trackingEventMeta}>
                        {event.location} • {event.date} at {event.time}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className={styles.recentShipments}>
          <h3 className={styles.recentShipmentsTitle}>Recent Shipments</h3>
          {!connection ? (
            <p className={styles.emptyState}>
              Connect your Shopify store to see recent shipments.
            </p>
          ) : shipments.length === 0 ? (
            <p className={styles.emptyState}>
              No recent shipments to display.
            </p>
          ) : (
            <div className={styles.shipmentsList}>
              {shipments.map((shipment) => (
                <div key={shipment.id} className={styles.shipmentItem}>
                  <div className={styles.shipmentInfo}>
                    <span className={styles.shipmentNumber}>{shipment.tracking_number}</span>
                    <span className={styles.shipmentOrder}>Order #{shipment.order_number}</span>
                  </div>
                  <span className={styles.shipmentStatus}>{shipment.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
