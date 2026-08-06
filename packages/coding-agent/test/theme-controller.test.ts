import type { TUI } from "@earendil-works/pi-tui";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { SettingsManager } from "../src/core/settings-manager.ts";
import {
	initTheme,
	setRegisteredThemes,
	type TerminalTheme,
	type Theme,
	theme,
} from "../src/modes/interactive/theme/theme.ts";
import { InteractiveThemeController } from "../src/modes/interactive/theme/theme-controller.ts";

function createUi(): {
	ui: TUI;
	queryTerminalBackgroundColor: ReturnType<typeof vi.fn>;
	queryTerminalColorScheme: ReturnType<typeof vi.fn>;
	setTerminalColorSchemeNotifications: ReturnType<typeof vi.fn>;
	emitTerminalColorScheme: (terminalTheme: TerminalTheme) => void;
} {
	const queryTerminalBackgroundColor = vi.fn();
	const queryTerminalColorScheme = vi.fn();
	const setTerminalColorSchemeNotifications = vi.fn();
	let terminalColorSchemeListener: ((terminalTheme: TerminalTheme) => void) | undefined;
	const ui = {
		invalidate: vi.fn(),
		requestRender: vi.fn(),
		setTerminalColorSchemeNotifications,
		onTerminalColorSchemeChange: vi.fn((listener: (terminalTheme: TerminalTheme) => void) => {
			terminalColorSchemeListener = listener;
			return vi.fn();
		}),
		queryTerminalBackgroundColor,
		queryTerminalColorScheme,
	} as unknown as TUI;
	return {
		ui,
		queryTerminalBackgroundColor,
		queryTerminalColorScheme,
		setTerminalColorSchemeNotifications,
		emitTerminalColorScheme: (terminalTheme) => terminalColorSchemeListener?.(terminalTheme),
	};
}

function createSettingsManager(themeSetting: string | undefined): {
	settingsManager: SettingsManager;
	setTheme: ReturnType<typeof vi.fn>;
	flush: ReturnType<typeof vi.fn>;
} {
	const setTheme = vi.fn();
	const flush = vi.fn(async () => {});
	const settingsManager = {
		getThemeSetting: vi.fn(() => themeSetting),
		setTheme,
		flush,
	} as unknown as SettingsManager;
	return { settingsManager, setTheme, flush };
}

afterEach(() => {
	setRegisteredThemes([]);
	initTheme("dark");
});

describe("InteractiveThemeController", () => {
	it("resolves a paired invocation override when settings are reapplied", async () => {
		setRegisteredThemes([{ name: "dayowl" }, { name: "nightowl" }] as Theme[]);
		const { ui, queryTerminalColorScheme, setTerminalColorSchemeNotifications } = createUi();
		queryTerminalColorScheme.mockResolvedValueOnce("light").mockResolvedValueOnce("dark");
		const { settingsManager, setTheme: setPersistedTheme, flush } = createSettingsManager("light/dark");
		const controller = new InteractiveThemeController(ui, settingsManager, {
			showError: vi.fn(),
			onChanged: vi.fn(),
			themeOverride: "dayowl/nightowl",
		});

		await controller.applyFromSettings();
		expect(theme.name).toBe("dayowl");

		await controller.applyFromSettings();
		expect(theme.name).toBe("nightowl");
		expect(queryTerminalColorScheme).toHaveBeenCalledTimes(2);
		expect(setTerminalColorSchemeNotifications).toHaveBeenCalledWith(true);
		expect(setPersistedTheme).not.toHaveBeenCalled();
		expect(flush).not.toHaveBeenCalled();
	});

	it("keeps a paired invocation override synchronized with terminal appearance", async () => {
		setRegisteredThemes([{ name: "dayowl" }, { name: "nightowl" }] as Theme[]);
		const { ui, queryTerminalColorScheme, emitTerminalColorScheme } = createUi();
		queryTerminalColorScheme.mockResolvedValue("light");
		const { settingsManager } = createSettingsManager("light/dark");
		const controller = new InteractiveThemeController(ui, settingsManager, {
			showError: vi.fn(),
			onChanged: vi.fn(),
			themeOverride: "dayowl/nightowl",
		});

		await controller.applyFromSettings();
		expect(theme.name).toBe("dayowl");

		emitTerminalColorScheme("dark");
		expect(theme.name).toBe("nightowl");
	});

	it("applies the invocation override instead of settings", async () => {
		setRegisteredThemes([{ name: "nightowl" }] as Theme[]);
		const { ui, queryTerminalBackgroundColor } = createUi();
		const { settingsManager, setTheme: setPersistedTheme, flush } = createSettingsManager("light/dark");
		const controller = new InteractiveThemeController(ui, settingsManager, {
			showError: vi.fn(),
			onChanged: vi.fn(),
			themeOverride: "nightowl",
		});

		expect(theme.name).toBe("nightowl");
		await controller.applyFromSettings();

		expect(theme.name).toBe("nightowl");
		expect(queryTerminalBackgroundColor).not.toHaveBeenCalled();
		expect(setPersistedTheme).not.toHaveBeenCalled();
		expect(flush).not.toHaveBeenCalled();
	});
});
