export const DEMO_COOKIE = "crm_demo_session";

export const DEMO_USER = {
  id: "00000000-0000-4000-8000-000000000001",
  email: "demo.agent@realestate.test",
  fullName: "Demo Agent",
  orgName: "Demo Realty Team",
};

/** Enabled whenever DEV_DEMO_MODE=true (works in both local and production) */
export function isDemoModeEnabled(): boolean {
  return process.env.DEV_DEMO_MODE === "true";
}
