import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { OfflineBanner } from "./OfflineBanner";

describe("OfflineBanner", () => {
  it("renders the offline message", () => {
    render(<OfflineBanner />);
    expect(
      screen.getByText("Sin conexion — algunos datos pueden no estar disponibles"),
    ).toBeTruthy();
  });

  it("has role=status for accessibility", () => {
    render(<OfflineBanner />);
    expect(screen.getByRole("status")).toBeTruthy();
  });
});
