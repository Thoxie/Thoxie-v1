/* PATH: /app/dashboard/page.js */
/* DIRECTORY: /app/dashboard */
/* FILE: page.js */
/* ACTION: OVERWRITE */
"use client";

export const dynamic = "force-dynamic";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import Header from "../_components/Header";
import Footer from "../_components/Footer";
import Container from "../_components/Container";
import PageTitle from "../_components/PageTitle";
import TextBlock from "../_components/TextBlock";

import { ROUTES } from "../_config/routes";

export default function LegacyDashboardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const query = searchParams?.toString?.() || "";
    const target = query ? `${ROUTES.dashboard}?${query}` : ROUTES.dashboard;
    router.replace(target);
  }, [router, searchParams]);

  return (
    <main style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Header />
      <Container style={{ flex: 1 }}>
        <PageTitle>Case Dashboard</PageTitle>
        <TextBlock>Redirecting to the current dashboard...</TextBlock>
      </Container>
      <Footer />
    </main>
  );
}
