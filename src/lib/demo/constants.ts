export const DEMO_COOKIE = "crm_demo_session";

export const DEMO_USER = {
  id: "00000000-0000-4000-8000-000000000001",
  email: "demo.agent@realestate.test",
  fullName: "Demo Agent",
  orgName: "Demo Realty Team",
};

/** Only when DEV_DEMO_MODE=true and not production */
export function isDemoModeEnabled(): boolean {
  return (
    process.env.DEV_DEMO_MODE === "true" && process.env.NODE_ENV !== "production"
  );
}
