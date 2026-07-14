import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { UpdateToast } from "./UpdateToast";

describe("UpdateToast", () => {
  it("renders the update message", () => {
    render(<UpdateToast />);
    expect(screen.getByText("Nueva version disponible")).toBeTruthy();
  });

  it("has Update and Dismiss buttons", () => {
    render(<UpdateToast />);
    expect(screen.getByText("Actualizar")).toBeTruthy();
    expect(screen.getByText("Descartar")).toBeTruthy();
  });

  it("hides when Dismiss is clicked", () => {
    render(<UpdateToast />);
    fireEvent.click(screen.getByText("Descartar"));
    expect(screen.queryByText("Nueva version disponible")).toBeNull();
  });

  it("sends SKIP_WAITING message on Update click", async () => {
    const postMessage = vi.fn();
    const getRegistration = vi.fn().mockResolvedValue({
      waiting: { postMessage },
    });

    Object.defineProperty(navigator, "serviceWorker", {
      value: { getRegistration },
      configurable: true,
    });

    render(<UpdateToast />);
    await fireEvent.click(screen.getByText("Actualizar"));

    expect(getRegistration).toHaveBeenCalled();
    expect(postMessage).toHaveBeenCalledWith({ type: "SKIP_WAITING" });
  });
});
