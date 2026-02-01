"use client";

import ReportsList from "./components/ReportsList";
import styles from "./page.module.css";

export default function DashboardPage() {
  return (
    <>
      <h1 className={styles.heading}>Reports</h1>
      <ReportsList />
    </>
  );
}
