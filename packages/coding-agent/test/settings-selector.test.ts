import { setKeybindings } from "@earendil-works/pi-tui";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { KeybindingsManager } from "../src/core/keybindings.ts";
import {
	type SettingsCallbacks,
	type SettingsConfig,
	SettingsSelectorComponent,
} from "../src/modes/interactive/components/settings-selector.ts";
import { initTheme } from "../src/modes/interactive/theme/theme.ts";
import { stripAnsi } from "../src/utils/ansi.ts";

describe("SettingsSelectorComponent", () => {
	beforeAll(() => {
		initTheme("dark");
		setKeybindings(new KeybindingsManager());
	});

	it("restores the invocation override when theme previews are canceled", () => {
		const onThemePreview = vi.fn();
		const selector = new SettingsSelectorComponent(
			{
				currentTheme: "light/dark",
				themeOverride: "solarized",
				terminalTheme: "dark",
				availableThemes: ["dark", "light", "nightowl", "solarized"],
				fullscreenScrollbar: "auto",
				warnings: {},
				availableThinkingLevels: [],
			} as unknown as SettingsConfig,
			{ onThemePreview } as unknown as SettingsCallbacks,
		);
		const settingsList = selector.getSettingsList();

		for (const character of "Theme") settingsList.handleInput(character);
		settingsList.handleInput("\r");
		settingsList.handleInput("\r");
		expect(stripAnsi(settingsList.render(120).join("\n"))).toMatch(/solarized\s+Active via --use-theme/);
		settingsList.handleInput("\x1b[B");
		settingsList.handleInput("\x1b");
		settingsList.handleInput("\x1b");

		expect(onThemePreview.mock.calls.flat()).toEqual(["nightowl", "solarized", "solarized"]);
	});

	it("cycles through fullscreen scrollbar modes", () => {
		const onChange = vi.fn();
		const selector = new SettingsSelectorComponent(
			{
				fullscreenScrollbar: "auto",
				warnings: {},
				availableThinkingLevels: [],
				availableThemes: [],
			} as unknown as SettingsConfig,
			{ onFullscreenScrollbarChange: onChange } as unknown as SettingsCallbacks,
		);
		const settingsList = selector.getSettingsList();

		for (const character of "Fullscreen scrollbar") settingsList.handleInput(character);
		settingsList.handleInput("\r");
		settingsList.handleInput("\r");
		settingsList.handleInput("\r");

		expect(onChange.mock.calls.flat()).toEqual(["always", "hidden", "auto"]);
	});
});
