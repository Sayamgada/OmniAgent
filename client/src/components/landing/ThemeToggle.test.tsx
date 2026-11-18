// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { ThemeToggle } from "./ThemeToggle";
import * as ThemeContextModule from "../../context/ThemeContext";

afterEach(() => {
  cleanup();
});

describe("ThemeToggle Component", () => {
  it("renders with a single thumb and exactly two icon options (Sun & Moon)", () => {
    const setLandingThemeMock = vi.fn();
    const toggleThemeMock = vi.fn();

    vi.spyOn(ThemeContextModule, "useSiteTheme").mockReturnValue({
      landingTheme: "light",
      heroTheme: "dark",
      destinationTheme: "light",
      siteTheme: "light",
      themeProgress: 0,
      variant: ThemeContextModule.OBSIDIAN_BRONZE_THEME,
      toggleTheme: toggleThemeMock,
      setLandingTheme: setLandingThemeMock,
      setTheme: setLandingThemeMock,
    });

    const { container } = render(<ThemeToggle />);

    // Should have a single role="radiogroup" container
    const radiogroup = screen.getByRole("radiogroup");
    expect(radiogroup).toBeDefined();

    // Exactly two buttons (options)
    const buttons = screen.getAllByRole("radio");
    expect(buttons).toHaveLength(2);

    const lightBtn = screen.getByRole("radio", { name: /light/i });
    const darkBtn = screen.getByRole("radio", { name: /dark/i });
    expect(lightBtn).toBeDefined();
    expect(darkBtn).toBeDefined();

    // Light button is checked when landingTheme is light
    expect(lightBtn.getAttribute("aria-checked")).toBe("true");
    expect(darkBtn.getAttribute("aria-checked")).toBe("false");

    // Exactly two icons in total in the DOM (no duplicates inside the thumb)
    const svgs = container.querySelectorAll("svg");
    expect(svgs).toHaveLength(2);

    // Clicking dark button calls setLandingTheme with "dark"
    fireEvent.click(darkBtn);
    expect(setLandingThemeMock).toHaveBeenCalledWith("dark");
  });

  it("handles dark landingTheme correctly and allows switching to light", () => {
    const setLandingThemeMock = vi.fn();
    const toggleThemeMock = vi.fn();

    vi.spyOn(ThemeContextModule, "useSiteTheme").mockReturnValue({
      landingTheme: "dark",
      heroTheme: "light",
      destinationTheme: "dark",
      siteTheme: "dark",
      themeProgress: 1,
      variant: ThemeContextModule.OBSIDIAN_BRONZE_THEME,
      toggleTheme: toggleThemeMock,
      setLandingTheme: setLandingThemeMock,
      setTheme: setLandingThemeMock,
    });

    render(<ThemeToggle />);

    const lightBtn = screen.getByRole("radio", { name: /light/i });
    const darkBtn = screen.getByRole("radio", { name: /dark/i });

    expect(lightBtn.getAttribute("aria-checked")).toBe("false");
    expect(darkBtn.getAttribute("aria-checked")).toBe("true");

    fireEvent.click(lightBtn);
    expect(setLandingThemeMock).toHaveBeenCalledWith("light");
  });

  it("supports mobile variant with correct classes", () => {
    vi.spyOn(ThemeContextModule, "useSiteTheme").mockReturnValue({
      landingTheme: "light",
      heroTheme: "dark",
      destinationTheme: "light",
      siteTheme: "light",
      themeProgress: 0,
      variant: ThemeContextModule.OBSIDIAN_BRONZE_THEME,
      toggleTheme: vi.fn(),
      setLandingTheme: vi.fn(),
      setTheme: vi.fn(),
    });

    const { container } = render(<ThemeToggle variant="mobile" />);
    const radiogroup = container.querySelector('[role="radiogroup"]');
    expect(radiogroup?.className).toContain("w-[66px]");
    expect(radiogroup?.className).toContain("h-[34px]");
  });
});
