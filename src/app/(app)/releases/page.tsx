import View from "./view";

// Loads its data in the browser after sign-in, so it is allowed to block on
// navigation; opts out of instant-navigation validation (see ../layout.tsx).
export const instant = false;

export default function Page() {
  return <View />;
}
