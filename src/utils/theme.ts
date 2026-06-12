import chalk, { Chalk } from 'chalk'
import { env } from './env.js'

export type Theme = {
  autoAccept: string
  bashBorder: string
  claude: string
  claudeShimmer: string // Lighter version of claude color for shimmer effect
  claudeBlue_FOR_SYSTEM_SPINNER: string
  claudeBlueShimmer_FOR_SYSTEM_SPINNER: string
  permission: string
  permissionShimmer: string // Lighter version of permission color for shimmer effect
  planMode: string
  ide: string
  promptBorder: string
  promptBorderShimmer: string // Lighter version of promptBorder color for shimmer effect
  text: string
  inverseText: string
  inactive: string
  inactiveShimmer: string // Lighter version of inactive color for shimmer effect
  subtle: string
  suggestion: string
  remember: string
  background: string
  // Semantic colors
  success: string
  error: string
  warning: string
  merged: string
  warningShimmer: string // Lighter version of warning color for shimmer effect
  // Diff colors
  diffAdded: string
  diffRemoved: string
  diffAddedDimmed: string
  diffRemovedDimmed: string
  // Word-level diff highlighting
  diffAddedWord: string
  diffRemovedWord: string
  // Agent colors
  red_FOR_SUBAGENTS_ONLY: string
  blue_FOR_SUBAGENTS_ONLY: string
  green_FOR_SUBAGENTS_ONLY: string
  yellow_FOR_SUBAGENTS_ONLY: string
  purple_FOR_SUBAGENTS_ONLY: string
  orange_FOR_SUBAGENTS_ONLY: string
  pink_FOR_SUBAGENTS_ONLY: string
  cyan_FOR_SUBAGENTS_ONLY: string
  // Grove colors
  professionalBlue: string
  // Chrome colors
  chromeYellow: string
  // TUI V2 colors
  clawd_body: string
  clawd_background: string
  userMessageBackground: string
  userMessageBackgroundHover: string
  /** Message-actions selection. Cool shift toward `suggestion` blue; distinct from default AND userMessageBackground. */
  messageActionsBackground: string
  /** Text-selection highlight background (alt-screen mouse selection). Solid
   *  bg that REPLACES the cell's bg while preserving its fg — matches native
   *  terminal selection. Previously SGR-7 inverse (swapped fg/bg per cell),
   *  which fragmented badly over syntax highlighting. */
  selectionBg: string
  bashMessageBackgroundColor: string

  memoryBackgroundColor: string
  rate_limit_fill: string
  rate_limit_empty: string
  fastMode: string
  fastModeShimmer: string
  // Brief/assistant mode label colors
  briefLabelYou: string
  briefLabelClaude: string
  // Rainbow colors for ultrathink keyword highlighting
  rainbow_red: string
  rainbow_orange: string
  rainbow_yellow: string
  rainbow_green: string
  rainbow_blue: string
  rainbow_indigo: string
  rainbow_violet: string
  rainbow_red_shimmer: string
  rainbow_orange_shimmer: string
  rainbow_yellow_shimmer: string
  rainbow_green_shimmer: string
  rainbow_blue_shimmer: string
  rainbow_indigo_shimmer: string
  rainbow_violet_shimmer: string
}

export const THEME_NAMES = [
  'dark',
  'light',
  'light-daltonized',
  'dark-daltonized',
  'light-ansi',
  'dark-ansi',
  'dracula',
  'catppuccin',
  'nord',
  'gruvbox',
  'tokyo-night',
  'one-dark',
  'solarized-dark',
  'solarized-light',
] as const

/** A renderable theme. Always resolvable to a concrete color palette. */
export type ThemeName = (typeof THEME_NAMES)[number]

export const THEME_SETTINGS = ['auto', ...THEME_NAMES] as const

/**
 * A theme preference as stored in user config. `'auto'` follows the system
 * dark/light mode and is resolved to a ThemeName at runtime.
 */
export type ThemeSetting = (typeof THEME_SETTINGS)[number]

/**
 * Light theme using explicit RGB values to avoid inconsistencies
 * from users' custom terminal ANSI color definitions
 */
const lightTheme: Theme = {
  autoAccept: 'rgb(135,0,255)', // Electric violet
  bashBorder: 'rgb(255,0,135)', // Vibrant pink
  claude: 'rgb(215,119,87)', // Claude orange
  claudeShimmer: 'rgb(245,149,117)', // Lighter claude orange for shimmer effect
  claudeBlue_FOR_SYSTEM_SPINNER: 'rgb(87,105,247)', // Medium blue for system spinner
  claudeBlueShimmer_FOR_SYSTEM_SPINNER: 'rgb(117,135,255)', // Lighter blue for system spinner shimmer
  permission: 'rgb(87,105,247)', // Medium blue
  permissionShimmer: 'rgb(137,155,255)', // Lighter blue for shimmer effect
  planMode: 'rgb(0,102,102)', // Muted teal
  ide: 'rgb(71,130,200)', // Muted blue
  promptBorder: 'rgb(153,153,153)', // Medium gray
  promptBorderShimmer: 'rgb(183,183,183)', // Lighter gray for shimmer effect
  text: 'rgb(0,0,0)', // Black
  inverseText: 'rgb(255,255,255)', // White
  inactive: 'rgb(102,102,102)', // Dark gray
  inactiveShimmer: 'rgb(142,142,142)', // Lighter gray for shimmer effect
  subtle: 'rgb(175,175,175)', // Light gray
  suggestion: 'rgb(87,105,247)', // Medium blue
  remember: 'rgb(0,0,255)', // Blue
  background: 'rgb(0,153,153)', // Cyan
  success: 'rgb(44,122,57)', // Green
  error: 'rgb(171,43,63)', // Red
  warning: 'rgb(150,108,30)', // Amber
  merged: 'rgb(135,0,255)', // Electric violet (matches autoAccept)
  warningShimmer: 'rgb(200,158,80)', // Lighter amber for shimmer effect
  diffAdded: 'rgb(105,219,124)', // Light green
  diffRemoved: 'rgb(255,168,180)', // Light red
  diffAddedDimmed: 'rgb(199,225,203)', // Very light green
  diffRemovedDimmed: 'rgb(253,210,216)', // Very light red
  diffAddedWord: 'rgb(47,157,68)', // Medium green
  diffRemovedWord: 'rgb(209,69,75)', // Medium red
  // Agent colors
  red_FOR_SUBAGENTS_ONLY: 'rgb(220,38,38)', // Red 600
  blue_FOR_SUBAGENTS_ONLY: 'rgb(37,99,235)', // Blue 600
  green_FOR_SUBAGENTS_ONLY: 'rgb(22,163,74)', // Green 600
  yellow_FOR_SUBAGENTS_ONLY: 'rgb(202,138,4)', // Yellow 600
  purple_FOR_SUBAGENTS_ONLY: 'rgb(147,51,234)', // Purple 600
  orange_FOR_SUBAGENTS_ONLY: 'rgb(234,88,12)', // Orange 600
  pink_FOR_SUBAGENTS_ONLY: 'rgb(219,39,119)', // Pink 600
  cyan_FOR_SUBAGENTS_ONLY: 'rgb(8,145,178)', // Cyan 600
  // Grove colors
  professionalBlue: 'rgb(106,155,204)',
  // Chrome colors
  chromeYellow: 'rgb(251,188,4)', // Chrome yellow
  // TUI V2 colors
  clawd_body: 'rgb(215,119,87)',
  clawd_background: 'rgb(0,0,0)',
  userMessageBackground: 'rgb(240, 240, 240)', // Slightly darker grey for optimal contrast
  userMessageBackgroundHover: 'rgb(252, 252, 252)', // ≥250 to quantize distinct from base at 256-color level
  messageActionsBackground: 'rgb(232, 236, 244)', // cool gray — darker than userMsg 240 (visible on white), slight blue toward `suggestion`
  selectionBg: 'rgb(180, 213, 255)', // classic light-mode selection blue (macOS/VS Code-ish); dark fgs stay readable
  bashMessageBackgroundColor: 'rgb(250, 245, 250)',

  memoryBackgroundColor: 'rgb(230, 245, 250)',
  rate_limit_fill: 'rgb(87,105,247)', // Medium blue
  rate_limit_empty: 'rgb(39,47,111)', // Dark blue
  fastMode: 'rgb(255,106,0)', // Electric orange
  fastModeShimmer: 'rgb(255,150,50)', // Lighter orange for shimmer
  // Brief/assistant mode
  briefLabelYou: 'rgb(37,99,235)', // Blue
  briefLabelClaude: 'rgb(215,119,87)', // Brand orange
  rainbow_red: 'rgb(235,95,87)',
  rainbow_orange: 'rgb(245,139,87)',
  rainbow_yellow: 'rgb(250,195,95)',
  rainbow_green: 'rgb(145,200,130)',
  rainbow_blue: 'rgb(130,170,220)',
  rainbow_indigo: 'rgb(155,130,200)',
  rainbow_violet: 'rgb(200,130,180)',
  rainbow_red_shimmer: 'rgb(250,155,147)',
  rainbow_orange_shimmer: 'rgb(255,185,137)',
  rainbow_yellow_shimmer: 'rgb(255,225,155)',
  rainbow_green_shimmer: 'rgb(185,230,180)',
  rainbow_blue_shimmer: 'rgb(180,205,240)',
  rainbow_indigo_shimmer: 'rgb(195,180,230)',
  rainbow_violet_shimmer: 'rgb(230,180,210)',
}

/**
 * Light ANSI theme using only the 16 standard ANSI colors
 * for terminals without true color support
 */
const lightAnsiTheme: Theme = {
  autoAccept: 'ansi:magenta',
  bashBorder: 'ansi:magenta',
  claude: 'ansi:redBright',
  claudeShimmer: 'ansi:yellowBright',
  claudeBlue_FOR_SYSTEM_SPINNER: 'ansi:blue',
  claudeBlueShimmer_FOR_SYSTEM_SPINNER: 'ansi:blueBright',
  permission: 'ansi:blue',
  permissionShimmer: 'ansi:blueBright',
  planMode: 'ansi:cyan',
  ide: 'ansi:blueBright',
  promptBorder: 'ansi:white',
  promptBorderShimmer: 'ansi:whiteBright',
  text: 'ansi:black',
  inverseText: 'ansi:white',
  inactive: 'ansi:blackBright',
  inactiveShimmer: 'ansi:white',
  subtle: 'ansi:blackBright',
  suggestion: 'ansi:blue',
  remember: 'ansi:blue',
  background: 'ansi:cyan',
  success: 'ansi:green',
  error: 'ansi:red',
  warning: 'ansi:yellow',
  merged: 'ansi:magenta',
  warningShimmer: 'ansi:yellowBright',
  diffAdded: 'ansi:green',
  diffRemoved: 'ansi:red',
  diffAddedDimmed: 'ansi:green',
  diffRemovedDimmed: 'ansi:red',
  diffAddedWord: 'ansi:greenBright',
  diffRemovedWord: 'ansi:redBright',
  // Agent colors
  red_FOR_SUBAGENTS_ONLY: 'ansi:red',
  blue_FOR_SUBAGENTS_ONLY: 'ansi:blue',
  green_FOR_SUBAGENTS_ONLY: 'ansi:green',
  yellow_FOR_SUBAGENTS_ONLY: 'ansi:yellow',
  purple_FOR_SUBAGENTS_ONLY: 'ansi:magenta',
  orange_FOR_SUBAGENTS_ONLY: 'ansi:redBright',
  pink_FOR_SUBAGENTS_ONLY: 'ansi:magentaBright',
  cyan_FOR_SUBAGENTS_ONLY: 'ansi:cyan',
  // Grove colors
  professionalBlue: 'ansi:blueBright',
  // Chrome colors
  chromeYellow: 'ansi:yellow', // Chrome yellow
  // TUI V2 colors
  clawd_body: 'ansi:redBright',
  clawd_background: 'ansi:black',
  userMessageBackground: 'ansi:white',
  userMessageBackgroundHover: 'ansi:whiteBright',
  messageActionsBackground: 'ansi:white',
  selectionBg: 'ansi:cyan', // lighter named bg for light-ansi; dark fgs stay readable
  bashMessageBackgroundColor: 'ansi:whiteBright',

  memoryBackgroundColor: 'ansi:white',
  rate_limit_fill: 'ansi:yellow',
  rate_limit_empty: 'ansi:black',
  fastMode: 'ansi:red',
  fastModeShimmer: 'ansi:redBright',
  briefLabelYou: 'ansi:blue',
  briefLabelClaude: 'ansi:redBright',
  rainbow_red: 'ansi:red',
  rainbow_orange: 'ansi:redBright',
  rainbow_yellow: 'ansi:yellow',
  rainbow_green: 'ansi:green',
  rainbow_blue: 'ansi:cyan',
  rainbow_indigo: 'ansi:blue',
  rainbow_violet: 'ansi:magenta',
  rainbow_red_shimmer: 'ansi:redBright',
  rainbow_orange_shimmer: 'ansi:yellow',
  rainbow_yellow_shimmer: 'ansi:yellowBright',
  rainbow_green_shimmer: 'ansi:greenBright',
  rainbow_blue_shimmer: 'ansi:cyanBright',
  rainbow_indigo_shimmer: 'ansi:blueBright',
  rainbow_violet_shimmer: 'ansi:magentaBright',
}

/**
 * Dark ANSI theme using only the 16 standard ANSI colors
 * for terminals without true color support
 */
const darkAnsiTheme: Theme = {
  autoAccept: 'ansi:magentaBright',
  bashBorder: 'ansi:magentaBright',
  claude: 'ansi:redBright',
  claudeShimmer: 'ansi:yellowBright',
  claudeBlue_FOR_SYSTEM_SPINNER: 'ansi:blueBright',
  claudeBlueShimmer_FOR_SYSTEM_SPINNER: 'ansi:blueBright',
  permission: 'ansi:blueBright',
  permissionShimmer: 'ansi:blueBright',
  planMode: 'ansi:cyanBright',
  ide: 'ansi:blue',
  promptBorder: 'ansi:white',
  promptBorderShimmer: 'ansi:whiteBright',
  text: 'ansi:whiteBright',
  inverseText: 'ansi:black',
  inactive: 'ansi:white',
  inactiveShimmer: 'ansi:whiteBright',
  subtle: 'ansi:white',
  suggestion: 'ansi:blueBright',
  remember: 'ansi:blueBright',
  background: 'ansi:cyanBright',
  success: 'ansi:greenBright',
  error: 'ansi:redBright',
  warning: 'ansi:yellowBright',
  merged: 'ansi:magentaBright',
  warningShimmer: 'ansi:yellowBright',
  diffAdded: 'ansi:green',
  diffRemoved: 'ansi:red',
  diffAddedDimmed: 'ansi:green',
  diffRemovedDimmed: 'ansi:red',
  diffAddedWord: 'ansi:greenBright',
  diffRemovedWord: 'ansi:redBright',
  // Agent colors
  red_FOR_SUBAGENTS_ONLY: 'ansi:redBright',
  blue_FOR_SUBAGENTS_ONLY: 'ansi:blueBright',
  green_FOR_SUBAGENTS_ONLY: 'ansi:greenBright',
  yellow_FOR_SUBAGENTS_ONLY: 'ansi:yellowBright',
  purple_FOR_SUBAGENTS_ONLY: 'ansi:magentaBright',
  orange_FOR_SUBAGENTS_ONLY: 'ansi:redBright',
  pink_FOR_SUBAGENTS_ONLY: 'ansi:magentaBright',
  cyan_FOR_SUBAGENTS_ONLY: 'ansi:cyanBright',
  // Grove colors
  professionalBlue: 'rgb(106,155,204)',
  // Chrome colors
  chromeYellow: 'ansi:yellowBright', // Chrome yellow
  // TUI V2 colors
  clawd_body: 'ansi:redBright',
  clawd_background: 'ansi:black',
  userMessageBackground: 'ansi:blackBright',
  userMessageBackgroundHover: 'ansi:white',
  messageActionsBackground: 'ansi:blackBright',
  selectionBg: 'ansi:blue', // darker named bg for dark-ansi; bright fgs stay readable
  bashMessageBackgroundColor: 'ansi:black',

  memoryBackgroundColor: 'ansi:blackBright',
  rate_limit_fill: 'ansi:yellow',
  rate_limit_empty: 'ansi:white',
  fastMode: 'ansi:redBright',
  fastModeShimmer: 'ansi:redBright',
  briefLabelYou: 'ansi:blueBright',
  briefLabelClaude: 'ansi:redBright',
  rainbow_red: 'ansi:red',
  rainbow_orange: 'ansi:redBright',
  rainbow_yellow: 'ansi:yellow',
  rainbow_green: 'ansi:green',
  rainbow_blue: 'ansi:cyan',
  rainbow_indigo: 'ansi:blue',
  rainbow_violet: 'ansi:magenta',
  rainbow_red_shimmer: 'ansi:redBright',
  rainbow_orange_shimmer: 'ansi:yellow',
  rainbow_yellow_shimmer: 'ansi:yellowBright',
  rainbow_green_shimmer: 'ansi:greenBright',
  rainbow_blue_shimmer: 'ansi:cyanBright',
  rainbow_indigo_shimmer: 'ansi:blueBright',
  rainbow_violet_shimmer: 'ansi:magentaBright',
}

/**
 * Light daltonized theme (color-blind friendly) using explicit RGB values
 * to avoid inconsistencies from users' custom terminal ANSI color definitions
 */
const lightDaltonizedTheme: Theme = {
  autoAccept: 'rgb(135,0,255)', // Electric violet
  bashBorder: 'rgb(0,102,204)', // Blue instead of pink
  claude: 'rgb(255,153,51)', // Orange adjusted for deuteranopia
  claudeShimmer: 'rgb(255,183,101)', // Lighter orange for shimmer effect
  claudeBlue_FOR_SYSTEM_SPINNER: 'rgb(51,102,255)', // Bright blue for system spinner
  claudeBlueShimmer_FOR_SYSTEM_SPINNER: 'rgb(101,152,255)', // Lighter bright blue for system spinner shimmer
  permission: 'rgb(51,102,255)', // Bright blue
  permissionShimmer: 'rgb(101,152,255)', // Lighter bright blue for shimmer
  planMode: 'rgb(51,102,102)', // Muted blue-gray (works for color-blind)
  ide: 'rgb(71,130,200)', // Muted blue
  promptBorder: 'rgb(153,153,153)', // Medium gray
  promptBorderShimmer: 'rgb(183,183,183)', // Lighter gray for shimmer
  text: 'rgb(0,0,0)', // Black
  inverseText: 'rgb(255,255,255)', // White
  inactive: 'rgb(102,102,102)', // Dark gray
  inactiveShimmer: 'rgb(142,142,142)', // Lighter gray for shimmer effect
  subtle: 'rgb(175,175,175)', // Light gray
  suggestion: 'rgb(51,102,255)', // Bright blue
  remember: 'rgb(51,102,255)', // Bright blue
  background: 'rgb(0,153,153)', // Cyan (color-blind friendly)
  success: 'rgb(0,102,153)', // Blue instead of green for deuteranopia
  error: 'rgb(204,0,0)', // Pure red for better distinction
  warning: 'rgb(255,153,0)', // Orange adjusted for deuteranopia
  merged: 'rgb(135,0,255)', // Electric violet (matches autoAccept)
  warningShimmer: 'rgb(255,183,50)', // Lighter orange for shimmer
  diffAdded: 'rgb(153,204,255)', // Light blue instead of green
  diffRemoved: 'rgb(255,204,204)', // Light red
  diffAddedDimmed: 'rgb(209,231,253)', // Very light blue
  diffRemovedDimmed: 'rgb(255,233,233)', // Very light red
  diffAddedWord: 'rgb(51,102,204)', // Medium blue (less intense than deep blue)
  diffRemovedWord: 'rgb(153,51,51)', // Softer red (less intense than deep red)
  // Agent colors (daltonism-friendly)
  red_FOR_SUBAGENTS_ONLY: 'rgb(204,0,0)', // Pure red
  blue_FOR_SUBAGENTS_ONLY: 'rgb(0,102,204)', // Pure blue
  green_FOR_SUBAGENTS_ONLY: 'rgb(0,204,0)', // Pure green
  yellow_FOR_SUBAGENTS_ONLY: 'rgb(255,204,0)', // Golden yellow
  purple_FOR_SUBAGENTS_ONLY: 'rgb(128,0,128)', // True purple
  orange_FOR_SUBAGENTS_ONLY: 'rgb(255,128,0)', // True orange
  pink_FOR_SUBAGENTS_ONLY: 'rgb(255,102,178)', // Adjusted pink
  cyan_FOR_SUBAGENTS_ONLY: 'rgb(0,178,178)', // Adjusted cyan
  // Grove colors
  professionalBlue: 'rgb(106,155,204)',
  // Chrome colors
  chromeYellow: 'rgb(251,188,4)', // Chrome yellow
  // TUI V2 colors
  clawd_body: 'rgb(215,119,87)',
  clawd_background: 'rgb(0,0,0)',
  userMessageBackground: 'rgb(220, 220, 220)', // Slightly darker grey for optimal contrast
  userMessageBackgroundHover: 'rgb(232, 232, 232)', // ≥230 to quantize distinct from base at 256-color level
  messageActionsBackground: 'rgb(210, 216, 226)', // cool gray — darker than userMsg 220, slight blue
  selectionBg: 'rgb(180, 213, 255)', // light selection blue; daltonized fgs are yellows/blues, both readable on light blue
  bashMessageBackgroundColor: 'rgb(250, 245, 250)',

  memoryBackgroundColor: 'rgb(230, 245, 250)',
  rate_limit_fill: 'rgb(51,102,255)', // Bright blue
  rate_limit_empty: 'rgb(23,46,114)', // Dark blue
  fastMode: 'rgb(255,106,0)', // Electric orange (color-blind safe)
  fastModeShimmer: 'rgb(255,150,50)', // Lighter orange for shimmer
  briefLabelYou: 'rgb(37,99,235)', // Blue
  briefLabelClaude: 'rgb(255,153,51)', // Orange adjusted for deuteranopia (matches claude)
  rainbow_red: 'rgb(235,95,87)',
  rainbow_orange: 'rgb(245,139,87)',
  rainbow_yellow: 'rgb(250,195,95)',
  rainbow_green: 'rgb(145,200,130)',
  rainbow_blue: 'rgb(130,170,220)',
  rainbow_indigo: 'rgb(155,130,200)',
  rainbow_violet: 'rgb(200,130,180)',
  rainbow_red_shimmer: 'rgb(250,155,147)',
  rainbow_orange_shimmer: 'rgb(255,185,137)',
  rainbow_yellow_shimmer: 'rgb(255,225,155)',
  rainbow_green_shimmer: 'rgb(185,230,180)',
  rainbow_blue_shimmer: 'rgb(180,205,240)',
  rainbow_indigo_shimmer: 'rgb(195,180,230)',
  rainbow_violet_shimmer: 'rgb(230,180,210)',
}

/**
 * Dark theme using explicit RGB values to avoid inconsistencies
 * from users' custom terminal ANSI color definitions
 */
const darkTheme: Theme = {
  autoAccept: 'rgb(175,135,255)', // Electric violet
  bashBorder: 'rgb(253,93,177)', // Bright pink
  claude: 'rgb(215,119,87)', // Claude orange
  claudeShimmer: 'rgb(235,159,127)', // Lighter claude orange for shimmer effect
  claudeBlue_FOR_SYSTEM_SPINNER: 'rgb(147,165,255)', // Blue for system spinner
  claudeBlueShimmer_FOR_SYSTEM_SPINNER: 'rgb(177,195,255)', // Lighter blue for system spinner shimmer
  permission: 'rgb(177,185,249)', // Light blue-purple
  permissionShimmer: 'rgb(207,215,255)', // Lighter blue-purple for shimmer
  planMode: 'rgb(72,150,140)', // Muted sage green
  ide: 'rgb(71,130,200)', // Muted blue
  promptBorder: 'rgb(136,136,136)', // Medium gray
  promptBorderShimmer: 'rgb(166,166,166)', // Lighter gray for shimmer
  text: 'rgb(255,255,255)', // White
  inverseText: 'rgb(0,0,0)', // Black
  inactive: 'rgb(153,153,153)', // Light gray
  inactiveShimmer: 'rgb(193,193,193)', // Lighter gray for shimmer effect
  subtle: 'rgb(80,80,80)', // Dark gray
  suggestion: 'rgb(177,185,249)', // Light blue-purple
  remember: 'rgb(177,185,249)', // Light blue-purple
  background: 'rgb(0,204,204)', // Bright cyan
  success: 'rgb(78,186,101)', // Bright green
  error: 'rgb(255,107,128)', // Bright red
  warning: 'rgb(255,193,7)', // Bright amber
  merged: 'rgb(175,135,255)', // Electric violet (matches autoAccept)
  warningShimmer: 'rgb(255,223,57)', // Lighter amber for shimmer
  diffAdded: 'rgb(34,92,43)', // Dark green
  diffRemoved: 'rgb(122,41,54)', // Dark red
  diffAddedDimmed: 'rgb(71,88,74)', // Very dark green
  diffRemovedDimmed: 'rgb(105,72,77)', // Very dark red
  diffAddedWord: 'rgb(56,166,96)', // Medium green
  diffRemovedWord: 'rgb(179,89,107)', // Softer red (less intense than bright red)
  // Agent colors
  red_FOR_SUBAGENTS_ONLY: 'rgb(220,38,38)', // Red 600
  blue_FOR_SUBAGENTS_ONLY: 'rgb(37,99,235)', // Blue 600
  green_FOR_SUBAGENTS_ONLY: 'rgb(22,163,74)', // Green 600
  yellow_FOR_SUBAGENTS_ONLY: 'rgb(202,138,4)', // Yellow 600
  purple_FOR_SUBAGENTS_ONLY: 'rgb(147,51,234)', // Purple 600
  orange_FOR_SUBAGENTS_ONLY: 'rgb(234,88,12)', // Orange 600
  pink_FOR_SUBAGENTS_ONLY: 'rgb(219,39,119)', // Pink 600
  cyan_FOR_SUBAGENTS_ONLY: 'rgb(8,145,178)', // Cyan 600
  // Grove colors
  professionalBlue: 'rgb(106,155,204)',
  // Chrome colors
  chromeYellow: 'rgb(251,188,4)', // Chrome yellow
  // TUI V2 colors
  clawd_body: 'rgb(215,119,87)',
  clawd_background: 'rgb(0,0,0)',
  userMessageBackground: 'rgb(55, 55, 55)', // Lighter grey for better visual contrast
  userMessageBackgroundHover: 'rgb(70, 70, 70)',
  messageActionsBackground: 'rgb(44, 50, 62)', // cool gray, slight blue
  selectionBg: 'rgb(38, 79, 120)', // classic dark-mode selection blue (VS Code dark default); light fgs stay readable
  bashMessageBackgroundColor: 'rgb(65, 60, 65)',

  memoryBackgroundColor: 'rgb(55, 65, 70)',
  rate_limit_fill: 'rgb(177,185,249)', // Light blue-purple
  rate_limit_empty: 'rgb(80,83,112)', // Medium blue-purple
  fastMode: 'rgb(255,120,20)', // Electric orange for dark bg
  fastModeShimmer: 'rgb(255,165,70)', // Lighter orange for shimmer
  briefLabelYou: 'rgb(122,180,232)', // Light blue
  briefLabelClaude: 'rgb(215,119,87)', // Brand orange
  rainbow_red: 'rgb(235,95,87)',
  rainbow_orange: 'rgb(245,139,87)',
  rainbow_yellow: 'rgb(250,195,95)',
  rainbow_green: 'rgb(145,200,130)',
  rainbow_blue: 'rgb(130,170,220)',
  rainbow_indigo: 'rgb(155,130,200)',
  rainbow_violet: 'rgb(200,130,180)',
  rainbow_red_shimmer: 'rgb(250,155,147)',
  rainbow_orange_shimmer: 'rgb(255,185,137)',
  rainbow_yellow_shimmer: 'rgb(255,225,155)',
  rainbow_green_shimmer: 'rgb(185,230,180)',
  rainbow_blue_shimmer: 'rgb(180,205,240)',
  rainbow_indigo_shimmer: 'rgb(195,180,230)',
  rainbow_violet_shimmer: 'rgb(230,180,210)',
}

/**
 * Dark daltonized theme (color-blind friendly) using explicit RGB values
 * to avoid inconsistencies from users' custom terminal ANSI color definitions
 */
const darkDaltonizedTheme: Theme = {
  autoAccept: 'rgb(175,135,255)', // Electric violet
  bashBorder: 'rgb(51,153,255)', // Bright blue
  claude: 'rgb(255,153,51)', // Orange adjusted for deuteranopia
  claudeShimmer: 'rgb(255,183,101)', // Lighter orange for shimmer effect
  claudeBlue_FOR_SYSTEM_SPINNER: 'rgb(153,204,255)', // Light blue for system spinner
  claudeBlueShimmer_FOR_SYSTEM_SPINNER: 'rgb(183,224,255)', // Lighter blue for system spinner shimmer
  permission: 'rgb(153,204,255)', // Light blue
  permissionShimmer: 'rgb(183,224,255)', // Lighter blue for shimmer
  planMode: 'rgb(102,153,153)', // Muted gray-teal (works for color-blind)
  ide: 'rgb(71,130,200)', // Muted blue
  promptBorder: 'rgb(136,136,136)', // Medium gray
  promptBorderShimmer: 'rgb(166,166,166)', // Lighter gray for shimmer
  text: 'rgb(255,255,255)', // White
  inverseText: 'rgb(0,0,0)', // Black
  inactive: 'rgb(153,153,153)', // Light gray
  inactiveShimmer: 'rgb(193,193,193)', // Lighter gray for shimmer effect
  subtle: 'rgb(80,80,80)', // Dark gray
  suggestion: 'rgb(153,204,255)', // Light blue
  remember: 'rgb(153,204,255)', // Light blue
  background: 'rgb(0,204,204)', // Bright cyan (color-blind friendly)
  success: 'rgb(51,153,255)', // Blue instead of green
  error: 'rgb(255,102,102)', // Bright red
  warning: 'rgb(255,204,0)', // Yellow-orange for deuteranopia
  merged: 'rgb(175,135,255)', // Electric violet (matches autoAccept)
  warningShimmer: 'rgb(255,234,50)', // Lighter yellow-orange for shimmer
  diffAdded: 'rgb(0,68,102)', // Dark blue
  diffRemoved: 'rgb(102,0,0)', // Dark red
  diffAddedDimmed: 'rgb(62,81,91)', // Dimmed blue
  diffRemovedDimmed: 'rgb(62,44,44)', // Dimmed red
  diffAddedWord: 'rgb(0,119,179)', // Medium blue
  diffRemovedWord: 'rgb(179,0,0)', // Medium red
  // Agent colors (daltonism-friendly, dark mode)
  red_FOR_SUBAGENTS_ONLY: 'rgb(255,102,102)', // Bright red
  blue_FOR_SUBAGENTS_ONLY: 'rgb(102,178,255)', // Bright blue
  green_FOR_SUBAGENTS_ONLY: 'rgb(102,255,102)', // Bright green
  yellow_FOR_SUBAGENTS_ONLY: 'rgb(255,255,102)', // Bright yellow
  purple_FOR_SUBAGENTS_ONLY: 'rgb(178,102,255)', // Bright purple
  orange_FOR_SUBAGENTS_ONLY: 'rgb(255,178,102)', // Bright orange
  pink_FOR_SUBAGENTS_ONLY: 'rgb(255,153,204)', // Bright pink
  cyan_FOR_SUBAGENTS_ONLY: 'rgb(102,204,204)', // Bright cyan
  // Grove colors
  professionalBlue: 'rgb(106,155,204)',
  // Chrome colors
  chromeYellow: 'rgb(251,188,4)', // Chrome yellow
  // TUI V2 colors
  clawd_body: 'rgb(215,119,87)',
  clawd_background: 'rgb(0,0,0)',
  userMessageBackground: 'rgb(55, 55, 55)', // Lighter grey for better visual contrast
  userMessageBackgroundHover: 'rgb(70, 70, 70)',
  messageActionsBackground: 'rgb(44, 50, 62)', // cool gray, slight blue
  selectionBg: 'rgb(38, 79, 120)', // classic dark-mode selection blue (VS Code dark default); light fgs stay readable
  bashMessageBackgroundColor: 'rgb(65, 60, 65)',

  memoryBackgroundColor: 'rgb(55, 65, 70)',
  rate_limit_fill: 'rgb(153,204,255)', // Light blue
  rate_limit_empty: 'rgb(69,92,115)', // Dark blue
  fastMode: 'rgb(255,120,20)', // Electric orange for dark bg (color-blind safe)
  fastModeShimmer: 'rgb(255,165,70)', // Lighter orange for shimmer
  briefLabelYou: 'rgb(122,180,232)', // Light blue
  briefLabelClaude: 'rgb(255,153,51)', // Orange adjusted for deuteranopia (matches claude)
  rainbow_red: 'rgb(235,95,87)',
  rainbow_orange: 'rgb(245,139,87)',
  rainbow_yellow: 'rgb(250,195,95)',
  rainbow_green: 'rgb(145,200,130)',
  rainbow_blue: 'rgb(130,170,220)',
  rainbow_indigo: 'rgb(155,130,200)',
  rainbow_violet: 'rgb(200,130,180)',
  rainbow_red_shimmer: 'rgb(250,155,147)',
  rainbow_orange_shimmer: 'rgb(255,185,137)',
  rainbow_yellow_shimmer: 'rgb(255,225,155)',
  rainbow_green_shimmer: 'rgb(185,230,180)',
  rainbow_blue_shimmer: 'rgb(180,205,240)',
  rainbow_indigo_shimmer: 'rgb(195,180,230)',
  rainbow_violet_shimmer: 'rgb(230,180,210)',
}

// ============================================================================
// Dracula Theme
// ============================================================================
const draculaTheme: Theme = {
  ...darkTheme,
  autoAccept: 'rgb(189,147,249)', // Purple
  bashBorder: 'rgb(255,121,198)', // Pink
  claude: 'rgb(255,184,108)', // Orange
  claudeShimmer: 'rgb(255,204,148)',
  claudeBlue_FOR_SYSTEM_SPINNER: 'rgb(139,233,253)', // Cyan
  claudeBlueShimmer_FOR_SYSTEM_SPINNER: 'rgb(189,243,255)',
  permission: 'rgb(139,233,253)', // Cyan
  permissionShimmer: 'rgb(189,243,255)',
  planMode: 'rgb(80,250,123)', // Green
  ide: 'rgb(139,233,253)',
  promptBorder: 'rgb(98,114,164)', // Comment gray
  promptBorderShimmer: 'rgb(138,154,196)',
  text: 'rgb(248,248,242)', // Foreground
  inverseText: 'rgb(40,42,54)', // Background
  inactive: 'rgb(98,114,164)',
  inactiveShimmer: 'rgb(138,154,196)',
  subtle: 'rgb(68,71,90)', // Current line
  suggestion: 'rgb(189,147,249)', // Purple
  remember: 'rgb(189,147,249)',
  background: 'rgb(40,42,54)', // Background
  success: 'rgb(80,250,123)', // Green
  error: 'rgb(255,85,85)', // Red
  warning: 'rgb(241,250,140)', // Yellow
  merged: 'rgb(189,147,249)',
  warningShimmer: 'rgb(251,255,180)',
  diffAdded: 'rgb(80,250,123)',
  diffRemoved: 'rgb(255,85,85)',
  diffAddedDimmed: 'rgb(60,120,60)',
  diffRemovedDimmed: 'rgb(120,60,60)',
  diffAddedWord: 'rgb(40,200,80)',
  diffRemovedWord: 'rgb(200,40,40)',
  red_FOR_SUBAGENTS_ONLY: 'rgb(255,85,85)',
  blue_FOR_SUBAGENTS_ONLY: 'rgb(139,233,253)',
  green_FOR_SUBAGENTS_ONLY: 'rgb(80,250,123)',
  yellow_FOR_SUBAGENTS_ONLY: 'rgb(241,250,140)',
  purple_FOR_SUBAGENTS_ONLY: 'rgb(189,147,249)',
  orange_FOR_SUBAGENTS_ONLY: 'rgb(255,184,108)',
  pink_FOR_SUBAGENTS_ONLY: 'rgb(255,121,198)',
  cyan_FOR_SUBAGENTS_ONLY: 'rgb(139,233,253)',
  professionalBlue: 'rgb(139,233,253)',
  chromeYellow: 'rgb(241,250,140)',
  clawd_body: 'rgb(255,184,108)',
  clawd_background: 'rgb(40,42,54)',
  userMessageBackground: 'rgb(50,52,64)',
  userMessageBackgroundHover: 'rgb(60,62,74)',
  messageActionsBackground: 'rgb(45,48,58)',
  selectionBg: 'rgb(68,71,90)',
  bashMessageBackgroundColor: 'rgb(50,48,55)',
  memoryBackgroundColor: 'rgb(45,55,60)',
  rate_limit_fill: 'rgb(189,147,249)',
  rate_limit_empty: 'rgb(70,68,80)',
  fastMode: 'rgb(255,121,198)',
  fastModeShimmer: 'rgb(255,161,218)',
  briefLabelYou: 'rgb(139,233,253)',
  briefLabelClaude: 'rgb(255,184,108)',
  rainbow_red: 'rgb(255,85,85)',
  rainbow_orange: 'rgb(255,184,108)',
  rainbow_yellow: 'rgb(241,250,140)',
  rainbow_green: 'rgb(80,250,123)',
  rainbow_blue: 'rgb(139,233,253)',
  rainbow_indigo: 'rgb(189,147,249)',
  rainbow_violet: 'rgb(255,121,198)',
  rainbow_red_shimmer: 'rgb(255,135,135)',
  rainbow_orange_shimmer: 'rgb(255,214,158)',
  rainbow_yellow_shimmer: 'rgb(255,255,180)',
  rainbow_green_shimmer: 'rgb(130,255,163)',
  rainbow_blue_shimmer: 'rgb(189,243,255)',
  rainbow_indigo_shimmer: 'rgb(219,197,255)',
  rainbow_violet_shimmer: 'rgb(255,171,228)',
}

// ============================================================================
// Catppuccin Mocha Theme
// ============================================================================
const catppuccinTheme: Theme = {
  ...darkTheme,
  autoAccept: 'rgb(166,227,200)', // Green
  bashBorder: 'rgb(245,194,231)', // Pink
  claude: 'rgb(250,179,135)', // Peach
  claudeShimmer: 'rgb(255,209,175)',
  claudeBlue_FOR_SYSTEM_SPINNER: 'rgb(137,180,250)', // Blue
  claudeBlueShimmer_FOR_SYSTEM_SPINNER: 'rgb(187,200,255)',
  permission: 'rgb(137,180,250)', // Blue
  permissionShimmer: 'rgb(187,200,255)',
  planMode: 'rgb(148,226,213)', // Teal
  ide: 'rgb(137,180,250)',
  promptBorder: 'rgb(108,112,134)', // Overlay0
  promptBorderShimmer: 'rgb(147,153,178)',
  text: 'rgb(205,214,244)', // Text
  inverseText: 'rgb(30,30,46)', // Base
  inactive: 'rgb(108,112,134)',
  inactiveShimmer: 'rgb(147,153,178)',
  subtle: 'rgb(88,91,112)', // Surface1
  suggestion: 'rgb(137,180,250)', // Blue
  remember: 'rgb(137,180,250)',
  background: 'rgb(30,30,46)', // Base
  success: 'rgb(166,227,200)', // Green
  error: 'rgb(243,139,168)', // Red
  warning: 'rgb(249,226,175)', // Yellow
  merged: 'rgb(203,166,247)', // Mauve
  warningShimmer: 'rgb(255,246,215)',
  diffAdded: 'rgb(166,227,200)',
  diffRemoved: 'rgb(243,139,168)',
  diffAddedDimmed: 'rgb(60,100,70)',
  diffRemovedDimmed: 'rgb(100,60,70)',
  diffAddedWord: 'rgb(100,200,130)',
  diffRemovedWord: 'rgb(200,100,130)',
  red_FOR_SUBAGENTS_ONLY: 'rgb(243,139,168)',
  blue_FOR_SUBAGENTS_ONLY: 'rgb(137,180,250)',
  green_FOR_SUBAGENTS_ONLY: 'rgb(166,227,200)',
  yellow_FOR_SUBAGENTS_ONLY: 'rgb(249,226,175)',
  purple_FOR_SUBAGENTS_ONLY: 'rgb(203,166,247)',
  orange_FOR_SUBAGENTS_ONLY: 'rgb(250,179,135)',
  pink_FOR_SUBAGENTS_ONLY: 'rgb(245,194,231)',
  cyan_FOR_SUBAGENTS_ONLY: 'rgb(148,226,213)',
  professionalBlue: 'rgb(137,180,250)',
  chromeYellow: 'rgb(249,226,175)',
  clawd_body: 'rgb(250,179,135)',
  clawd_background: 'rgb(30,30,46)',
  userMessageBackground: 'rgb(40,40,56)',
  userMessageBackgroundHover: 'rgb(50,50,66)',
  messageActionsBackground: 'rgb(36,36,50)',
  selectionBg: 'rgb(60,60,80)',
  bashMessageBackgroundColor: 'rgb(42,40,50)',
  memoryBackgroundColor: 'rgb(35,45,55)',
  rate_limit_fill: 'rgb(137,180,250)',
  rate_limit_empty: 'rgb(60,65,85)',
  fastMode: 'rgb(250,179,135)',
  fastModeShimmer: 'rgb(255,209,175)',
  briefLabelYou: 'rgb(137,180,250)',
  briefLabelClaude: 'rgb(250,179,135)',
  rainbow_red: 'rgb(243,139,168)',
  rainbow_orange: 'rgb(250,179,135)',
  rainbow_yellow: 'rgb(249,226,175)',
  rainbow_green: 'rgb(166,227,200)',
  rainbow_blue: 'rgb(137,180,250)',
  rainbow_indigo: 'rgb(203,166,247)',
  rainbow_violet: 'rgb(245,194,231)',
  rainbow_red_shimmer: 'rgb(248,189,208)',
  rainbow_orange_shimmer: 'rgb(255,219,185)',
  rainbow_yellow_shimmer: 'rgb(255,246,215)',
  rainbow_green_shimmer: 'rgb(206,237,220)',
  rainbow_blue_shimmer: 'rgb(187,200,255)',
  rainbow_indigo_shimmer: 'rgb(223,206,247)',
  rainbow_violet_shimmer: 'rgb(250,224,241)',
}

// ============================================================================
// Nord Theme
// ============================================================================
const nordTheme: Theme = {
  ...darkTheme,
  autoAccept: 'rgb(136,192,208)', // Frost3
  bashBorder: 'rgb(163,190,140)', // Aurora green
  claude: 'rgb(216,222,233)', // Snow storm
  claudeShimmer: 'rgb(236,239,244)',
  claudeBlue_FOR_SYSTEM_SPINNER: 'rgb(129,161,193)', // Frost2
  claudeBlueShimmer_FOR_SYSTEM_SPINNER: 'rgb(169,191,213)',
  permission: 'rgb(129,161,193)', // Frost2
  permissionShimmer: 'rgb(169,191,213)',
  planMode: 'rgb(143,188,187)', // Frost1
  ide: 'rgb(129,161,193)',
  promptBorder: 'rgb(76,86,106)', // Polar night
  promptBorderShimmer: 'rgb(106,116,136)',
  text: 'rgb(216,222,233)', // Snow storm
  inverseText: 'rgb(46,52,64)', // Polar night
  inactive: 'rgb(76,86,106)',
  inactiveShimmer: 'rgb(106,116,136)',
  subtle: 'rgb(67,76,94)',
  suggestion: 'rgb(136,192,208)', // Frost3
  remember: 'rgb(136,192,208)',
  background: 'rgb(46,52,64)', // Polar night
  success: 'rgb(163,190,140)', // Aurora green
  error: 'rgb(191,97,106)', // Aurora red
  warning: 'rgb(235,203,139)', // Aurora yellow
  merged: 'rgb(180,142,173)', // Aurora purple
  warningShimmer: 'rgb(245,223,179)',
  diffAdded: 'rgb(163,190,140)',
  diffRemoved: 'rgb(191,97,106)',
  diffAddedDimmed: 'rgb(80,110,80)',
  diffRemovedDimmed: 'rgb(110,70,80)',
  diffAddedWord: 'rgb(120,170,100)',
  diffRemovedWord: 'rgb(170,80,100)',
  red_FOR_SUBAGENTS_ONLY: 'rgb(191,97,106)',
  blue_FOR_SUBAGENTS_ONLY: 'rgb(129,161,193)',
  green_FOR_SUBAGENTS_ONLY: 'rgb(163,190,140)',
  yellow_FOR_SUBAGENTS_ONLY: 'rgb(235,203,139)',
  purple_FOR_SUBAGENTS_ONLY: 'rgb(180,142,173)',
  orange_FOR_SUBAGENTS_ONLY: 'rgb(216,222,233)',
  pink_FOR_SUBAGENTS_ONLY: 'rgb(163,190,140)',
  cyan_FOR_SUBAGENTS_ONLY: 'rgb(136,192,208)',
  professionalBlue: 'rgb(129,161,193)',
  chromeYellow: 'rgb(235,203,139)',
  clawd_body: 'rgb(216,222,233)',
  clawd_background: 'rgb(46,52,64)',
  userMessageBackground: 'rgb(52,58,72)',
  userMessageBackgroundHover: 'rgb(62,68,82)',
  messageActionsBackground: 'rgb(48,54,68)',
  selectionBg: 'rgb(56,64,80)',
  bashMessageBackgroundColor: 'rgb(50,55,68)',
  memoryBackgroundColor: 'rgb(45,55,65)',
  rate_limit_fill: 'rgb(136,192,208)',
  rate_limit_empty: 'rgb(50,58,72)',
  fastMode: 'rgb(235,203,139)',
  fastModeShimmer: 'rgb(245,223,179)',
  briefLabelYou: 'rgb(129,161,193)',
  briefLabelClaude: 'rgb(216,222,233)',
  rainbow_red: 'rgb(191,97,106)',
  rainbow_orange: 'rgb(216,222,233)',
  rainbow_yellow: 'rgb(235,203,139)',
  rainbow_green: 'rgb(163,190,140)',
  rainbow_blue: 'rgb(136,192,208)',
  rainbow_indigo: 'rgb(129,161,193)',
  rainbow_violet: 'rgb(180,142,173)',
  rainbow_red_shimmer: 'rgb(210,130,140)',
  rainbow_orange_shimmer: 'rgb(230,235,240)',
  rainbow_yellow_shimmer: 'rgb(245,223,179)',
  rainbow_green_shimmer: 'rgb(193,210,170)',
  rainbow_blue_shimmer: 'rgb(176,202,218)',
  rainbow_indigo_shimmer: 'rgb(169,191,213)',
  rainbow_violet_shimmer: 'rgb(200,172,193)',
}

// ============================================================================
// Gruvbox Dark Theme
// ============================================================================
const gruvboxTheme: Theme = {
  ...darkTheme,
  autoAccept: 'rgb(184,187,38)', // Green
  bashBorder: 'rgb(211,134,155)', // Pink
  claude: 'rgb(250,189,47)', // Yellow
  claudeShimmer: 'rgb(255,219,87)',
  claudeBlue_FOR_SYSTEM_SPINNER: 'rgb(131,165,152)', // Aqua
  claudeBlueShimmer_FOR_SYSTEM_SPINNER: 'rgb(171,195,182)',
  permission: 'rgb(131,165,152)', // Aqua
  permissionShimmer: 'rgb(171,195,182)',
  planMode: 'rgb(142,192,124)', // Aqua green
  ide: 'rgb(131,165,152)',
  promptBorder: 'rgb(124,111,100)', // Gray
  promptBorderShimmer: 'rgb(154,141,130)',
  text: 'rgb(235,219,178)', // Foreground
  inverseText: 'rgb(40,40,40)', // Background
  inactive: 'rgb(124,111,100)',
  inactiveShimmer: 'rgb(154,141,130)',
  subtle: 'rgb(80,73,69)', // BG1
  suggestion: 'rgb(131,165,152)', // Aqua
  remember: 'rgb(131,165,152)',
  background: 'rgb(40,40,40)', // Background
  success: 'rgb(184,187,38)', // Green
  error: 'rgb(251,73,52)', // Red
  warning: 'rgb(250,189,47)', // Yellow
  merged: 'rgb(211,134,155)', // Purple
  warningShimmer: 'rgb(255,219,87)',
  diffAdded: 'rgb(184,187,38)',
  diffRemoved: 'rgb(251,73,52)',
  diffAddedDimmed: 'rgb(80,90,50)',
  diffRemovedDimmed: 'rgb(90,50,50)',
  diffAddedWord: 'rgb(150,160,40)',
  diffRemovedWord: 'rgb(200,60,50)',
  red_FOR_SUBAGENTS_ONLY: 'rgb(251,73,52)',
  blue_FOR_SUBAGENTS_ONLY: 'rgb(131,165,152)',
  green_FOR_SUBAGENTS_ONLY: 'rgb(184,187,38)',
  yellow_FOR_SUBAGENTS_ONLY: 'rgb(250,189,47)',
  purple_FOR_SUBAGENTS_ONLY: 'rgb(211,134,155)',
  orange_FOR_SUBAGENTS_ONLY: 'rgb(254,128,25)',
  pink_FOR_SUBAGENTS_ONLY: 'rgb(211,134,155)',
  cyan_FOR_SUBAGENTS_ONLY: 'rgb(142,192,124)',
  professionalBlue: 'rgb(131,165,152)',
  chromeYellow: 'rgb(250,189,47)',
  clawd_body: 'rgb(250,189,47)',
  clawd_background: 'rgb(40,40,40)',
  userMessageBackground: 'rgb(50,50,50)',
  userMessageBackgroundHover: 'rgb(60,60,60)',
  messageActionsBackground: 'rgb(44,44,44)',
  selectionBg: 'rgb(60,56,52)',
  bashMessageBackgroundColor: 'rgb(52,48,48)',
  memoryBackgroundColor: 'rgb(45,50,48)',
  rate_limit_fill: 'rgb(131,165,152)',
  rate_limit_empty: 'rgb(55,52,48)',
  fastMode: 'rgb(254,128,25)',
  fastModeShimmer: 'rgb(255,168,65)',
  briefLabelYou: 'rgb(131,165,152)',
  briefLabelClaude: 'rgb(250,189,47)',
  rainbow_red: 'rgb(251,73,52)',
  rainbow_orange: 'rgb(254,128,25)',
  rainbow_yellow: 'rgb(250,189,47)',
  rainbow_green: 'rgb(184,187,38)',
  rainbow_blue: 'rgb(131,165,152)',
  rainbow_indigo: 'rgb(211,134,155)',
  rainbow_violet: 'rgb(211,134,155)',
  rainbow_red_shimmer: 'rgb(255,113,92)',
  rainbow_orange_shimmer: 'rgb(255,178,65)',
  rainbow_yellow_shimmer: 'rgb(255,219,87)',
  rainbow_green_shimmer: 'rgb(214,217,78)',
  rainbow_blue_shimmer: 'rgb(171,195,182)',
  rainbow_indigo_shimmer: 'rgb(231,174,185)',
  rainbow_violet_shimmer: 'rgb(231,174,185)',
}

// ============================================================================
// Tokyo Night Theme
// ============================================================================
const tokyoNightTheme: Theme = {
  ...darkTheme,
  autoAccept: 'rgb(180,142,220)', // Purple
  bashBorder: 'rgb(255,117,150)', // Pink
  claude: 'rgb(195,168,230)', // Soft purple
  claudeShimmer: 'rgb(215,198,240)',
  claudeBlue_FOR_SYSTEM_SPINNER: 'rgb(125,207,255)', // Light blue
  claudeBlueShimmer_FOR_SYSTEM_SPINNER: 'rgb(175,227,255)',
  permission: 'rgb(125,207,255)', // Light blue
  permissionShimmer: 'rgb(175,227,255)',
  planMode: 'rgb(158,206,106)', // Green
  ide: 'rgb(125,207,255)',
  promptBorder: 'rgb(86,95,137)', // Comment
  promptBorderShimmer: 'rgb(116,125,167)',
  text: 'rgb(169,177,214)', // Foreground
  inverseText: 'rgb(26,27,38)', // Background
  inactive: 'rgb(86,95,137)',
  inactiveShimmer: 'rgb(116,125,167)',
  subtle: 'rgb(65,72,105)', // BG highlight
  suggestion: 'rgb(125,207,255)', // Light blue
  remember: 'rgb(125,207,255)',
  background: 'rgb(26,27,38)', // Background
  success: 'rgb(158,206,106)', // Green
  error: 'rgb(247,118,142)', // Red
  warning: 'rgb(224,175,104)', // Yellow
  merged: 'rgb(180,142,220)', // Purple
  warningShimmer: 'rgb(244,205,144)',
  diffAdded: 'rgb(158,206,106)',
  diffRemoved: 'rgb(247,118,142)',
  diffAddedDimmed: 'rgb(70,100,70)',
  diffRemovedDimmed: 'rgb(100,60,70)',
  diffAddedWord: 'rgb(100,180,80)',
  diffRemovedWord: 'rgb(200,80,100)',
  red_FOR_SUBAGENTS_ONLY: 'rgb(247,118,142)',
  blue_FOR_SUBAGENTS_ONLY: 'rgb(125,207,255)',
  green_FOR_SUBAGENTS_ONLY: 'rgb(158,206,106)',
  yellow_FOR_SUBAGENTS_ONLY: 'rgb(224,175,104)',
  purple_FOR_SUBAGENTS_ONLY: 'rgb(180,142,220)',
  orange_FOR_SUBAGENTS_ONLY: 'rgb(255,158,100)',
  pink_FOR_SUBAGENTS_ONLY: 'rgb(255,117,150)',
  cyan_FOR_SUBAGENTS_ONLY: 'rgb(137,221,255)',
  professionalBlue: 'rgb(125,207,255)',
  chromeYellow: 'rgb(224,175,104)',
  clawd_body: 'rgb(195,168,230)',
  clawd_background: 'rgb(26,27,38)',
  userMessageBackground: 'rgb(32,33,48)',
  userMessageBackgroundHover: 'rgb(42,43,58)',
  messageActionsBackground: 'rgb(28,29,42)',
  selectionBg: 'rgb(46,52,78)',
  bashMessageBackgroundColor: 'rgb(34,32,44)',
  memoryBackgroundColor: 'rgb(30,38,48)',
  rate_limit_fill: 'rgb(125,207,255)',
  rate_limit_empty: 'rgb(40,45,65)',
  fastMode: 'rgb(255,158,100)',
  fastModeShimmer: 'rgb(255,188,130)',
  briefLabelYou: 'rgb(125,207,255)',
  briefLabelClaude: 'rgb(195,168,230)',
  rainbow_red: 'rgb(247,118,142)',
  rainbow_orange: 'rgb(255,158,100)',
  rainbow_yellow: 'rgb(224,175,104)',
  rainbow_green: 'rgb(158,206,106)',
  rainbow_blue: 'rgb(125,207,255)',
  rainbow_indigo: 'rgb(180,142,220)',
  rainbow_violet: 'rgb(255,117,150)',
  rainbow_red_shimmer: 'rgb(252,168,182)',
  rainbow_orange_shimmer: 'rgb(255,198,140)',
  rainbow_yellow_shimmer: 'rgb(244,205,144)',
  rainbow_green_shimmer: 'rgb(198,226,146)',
  rainbow_blue_shimmer: 'rgb(175,227,255)',
  rainbow_indigo_shimmer: 'rgb(210,182,240)',
  rainbow_violet_shimmer: 'rgb(255,167,180)',
}

// ============================================================================
// One Dark Pro Theme
// ============================================================================
const oneDarkTheme: Theme = {
  ...darkTheme,
  autoAccept: 'rgb(198,120,221)', // Purple
  bashBorder: 'rgb(224,108,117)', // Red
  claude: 'rgb(229,192,123)', // Yellow
  claudeShimmer: 'rgb(249,222,163)',
  claudeBlue_FOR_SYSTEM_SPINNER: 'rgb(97,175,239)', // Blue
  claudeBlueShimmer_FOR_SYSTEM_SPINNER: 'rgb(147,195,249)',
  permission: 'rgb(97,175,239)', // Blue
  permissionShimmer: 'rgb(147,195,249)',
  planMode: 'rgb(152,195,121)', // Green
  ide: 'rgb(97,175,239)',
  promptBorder: 'rgb(92,99,112)', // Comment
  promptBorderShimmer: 'rgb(122,129,142)',
  text: 'rgb(171,178,191)', // Foreground
  inverseText: 'rgb(33,37,43)', // Background
  inactive: 'rgb(92,99,112)',
  inactiveShimmer: 'rgb(122,129,142)',
  subtle: 'rgb(59,64,74)', // Gutter
  suggestion: 'rgb(97,175,239)', // Blue
  remember: 'rgb(97,175,239)',
  background: 'rgb(33,37,43)', // Background
  success: 'rgb(152,195,121)', // Green
  error: 'rgb(224,108,117)', // Red
  warning: 'rgb(229,192,123)', // Yellow
  merged: 'rgb(198,120,221)', // Purple
  warningShimmer: 'rgb(249,222,163)',
  diffAdded: 'rgb(152,195,121)',
  diffRemoved: 'rgb(224,108,117)',
  diffAddedDimmed: 'rgb(70,100,70)',
  diffRemovedDimmed: 'rgb(100,60,70)',
  diffAddedWord: 'rgb(100,170,80)',
  diffRemovedWord: 'rgb(180,70,80)',
  red_FOR_SUBAGENTS_ONLY: 'rgb(224,108,117)',
  blue_FOR_SUBAGENTS_ONLY: 'rgb(97,175,239)',
  green_FOR_SUBAGENTS_ONLY: 'rgb(152,195,121)',
  yellow_FOR_SUBAGENTS_ONLY: 'rgb(229,192,123)',
  purple_FOR_SUBAGENTS_ONLY: 'rgb(198,120,221)',
  orange_FOR_SUBAGENTS_ONLY: 'rgb(209,154,102)',
  pink_FOR_SUBAGENTS_ONLY: 'rgb(198,120,221)',
  cyan_FOR_SUBAGENTS_ONLY: 'rgb(86,182,194)',
  professionalBlue: 'rgb(97,175,239)',
  chromeYellow: 'rgb(229,192,123)',
  clawd_body: 'rgb(229,192,123)',
  clawd_background: 'rgb(33,37,43)',
  userMessageBackground: 'rgb(40,44,52)',
  userMessageBackgroundHover: 'rgb(50,54,62)',
  messageActionsBackground: 'rgb(36,40,48)',
  selectionBg: 'rgb(51,56,66)',
  bashMessageBackgroundColor: 'rgb(42,40,44)',
  memoryBackgroundColor: 'rgb(35,42,48)',
  rate_limit_fill: 'rgb(97,175,239)',
  rate_limit_empty: 'rgb(45,48,58)',
  fastMode: 'rgb(209,154,102)',
  fastModeShimmer: 'rgb(229,184,132)',
  briefLabelYou: 'rgb(97,175,239)',
  briefLabelClaude: 'rgb(229,192,123)',
  rainbow_red: 'rgb(224,108,117)',
  rainbow_orange: 'rgb(209,154,102)',
  rainbow_yellow: 'rgb(229,192,123)',
  rainbow_green: 'rgb(152,195,121)',
  rainbow_blue: 'rgb(97,175,239)',
  rainbow_indigo: 'rgb(198,120,221)',
  rainbow_violet: 'rgb(198,120,221)',
  rainbow_red_shimmer: 'rgb(244,158,157)',
  rainbow_orange_shimmer: 'rgb(229,184,132)',
  rainbow_yellow_shimmer: 'rgb(249,222,163)',
  rainbow_green_shimmer: 'rgb(192,225,161)',
  rainbow_blue_shimmer: 'rgb(147,195,249)',
  rainbow_indigo_shimmer: 'rgb(228,170,251)',
  rainbow_violet_shimmer: 'rgb(228,170,251)',
}

// ============================================================================
// Solarized Dark Theme
// ============================================================================
const solarizedDarkTheme: Theme = {
  ...darkTheme,
  autoAccept: 'rgb(108,113,196)', // Violet
  bashBorder: 'rgb(211,54,130)', // Magenta
  claude: 'rgb(181,137,0)', // Yellow
  claudeShimmer: 'rgb(211,167,40)',
  claudeBlue_FOR_SYSTEM_SPINNER: 'rgb(38,139,210)', // Blue
  claudeBlueShimmer_FOR_SYSTEM_SPINNER: 'rgb(88,159,220)',
  permission: 'rgb(38,139,210)', // Blue
  permissionShimmer: 'rgb(88,159,220)',
  planMode: 'rgb(42,161,152)', // Cyan
  ide: 'rgb(38,139,210)',
  promptBorder: 'rgb(88,110,117)', // Base00
  promptBorderShimmer: 'rgb(118,140,147)',
  text: 'rgb(131,148,150)', // Base0
  inverseText: 'rgb(0,43,54)', // Base03
  inactive: 'rgb(88,110,117)',
  inactiveShimmer: 'rgb(118,140,147)',
  subtle: 'rgb(68,90,97)', // Base01
  suggestion: 'rgb(38,139,210)', // Blue
  remember: 'rgb(38,139,210)',
  background: 'rgb(0,43,54)', // Base03
  success: 'rgb(133,153,0)', // Green
  error: 'rgb(220,50,47)', // Red
  warning: 'rgb(181,137,0)', // Yellow
  merged: 'rgb(108,113,196)', // Violet
  warningShimmer: 'rgb(211,167,40)',
  diffAdded: 'rgb(133,153,0)',
  diffRemoved: 'rgb(220,50,47)',
  diffAddedDimmed: 'rgb(60,80,40)',
  diffRemovedDimmed: 'rgb(80,40,40)',
  diffAddedWord: 'rgb(100,130,0)',
  diffRemovedWord: 'rgb(180,40,40)',
  red_FOR_SUBAGENTS_ONLY: 'rgb(220,50,47)',
  blue_FOR_SUBAGENTS_ONLY: 'rgb(38,139,210)',
  green_FOR_SUBAGENTS_ONLY: 'rgb(133,153,0)',
  yellow_FOR_SUBAGENTS_ONLY: 'rgb(181,137,0)',
  purple_FOR_SUBAGENTS_ONLY: 'rgb(108,113,196)',
  orange_FOR_SUBAGENTS_ONLY: 'rgb(203,75,22)',
  pink_FOR_SUBAGENTS_ONLY: 'rgb(211,54,130)',
  cyan_FOR_SUBAGENTS_ONLY: 'rgb(42,161,152)',
  professionalBlue: 'rgb(38,139,210)',
  chromeYellow: 'rgb(181,137,0)',
  clawd_body: 'rgb(181,137,0)',
  clawd_background: 'rgb(0,43,54)',
  userMessageBackground: 'rgb(10,53,64)',
  userMessageBackgroundHover: 'rgb(20,63,74)',
  messageActionsBackground: 'rgb(6,48,58)',
  selectionBg: 'rgb(0,63,74)',
  bashMessageBackgroundColor: 'rgb(12,48,56)',
  memoryBackgroundColor: 'rgb(8,50,60)',
  rate_limit_fill: 'rgb(38,139,210)',
  rate_limit_empty: 'rgb(20,50,60)',
  fastMode: 'rgb(203,75,22)',
  fastModeShimmer: 'rgb(223,105,62)',
  briefLabelYou: 'rgb(38,139,210)',
  briefLabelClaude: 'rgb(181,137,0)',
  rainbow_red: 'rgb(220,50,47)',
  rainbow_orange: 'rgb(203,75,22)',
  rainbow_yellow: 'rgb(181,137,0)',
  rainbow_green: 'rgb(133,153,0)',
  rainbow_blue: 'rgb(38,139,210)',
  rainbow_indigo: 'rgb(108,113,196)',
  rainbow_violet: 'rgb(211,54,130)',
  rainbow_red_shimmer: 'rgb(240,90,87)',
  rainbow_orange_shimmer: 'rgb(223,105,62)',
  rainbow_yellow_shimmer: 'rgb(211,167,40)',
  rainbow_green_shimmer: 'rgb(173,183,50)',
  rainbow_blue_shimmer: 'rgb(88,159,220)',
  rainbow_indigo_shimmer: 'rgb(148,153,216)',
  rainbow_violet_shimmer: 'rgb(231,94,160)',
}

// ============================================================================
// Solarized Light Theme
// ============================================================================
const solarizedLightTheme: Theme = {
  ...lightTheme,
  autoAccept: 'rgb(108,113,196)', // Violet
  bashBorder: 'rgb(211,54,130)', // Magenta
  claude: 'rgb(181,137,0)', // Yellow
  claudeShimmer: 'rgb(211,167,40)',
  claudeBlue_FOR_SYSTEM_SPINNER: 'rgb(38,139,210)', // Blue
  claudeBlueShimmer_FOR_SYSTEM_SPINNER: 'rgb(88,159,220)',
  permission: 'rgb(38,139,210)', // Blue
  permissionShimmer: 'rgb(88,159,220)',
  planMode: 'rgb(42,161,152)', // Cyan
  ide: 'rgb(38,139,210)',
  promptBorder: 'rgb(147,161,161)', // Base1
  promptBorderShimmer: 'rgb(177,181,181)',
  text: 'rgb(101,123,131)', // Base00
  inverseText: 'rgb(253,246,227)', // Base3
  inactive: 'rgb(147,161,161)',
  inactiveShimmer: 'rgb(177,181,181)',
  subtle: 'rgb(131,148,150)', // Base0
  suggestion: 'rgb(38,139,210)', // Blue
  remember: 'rgb(38,139,210)',
  background: 'rgb(42,161,152)', // Cyan
  success: 'rgb(133,153,0)', // Green
  error: 'rgb(220,50,47)', // Red
  warning: 'rgb(181,137,0)', // Yellow
  merged: 'rgb(108,113,196)', // Violet
  warningShimmer: 'rgb(211,167,40)',
  diffAdded: 'rgb(105,219,124)',
  diffRemoved: 'rgb(255,168,180)',
  diffAddedDimmed: 'rgb(199,225,203)',
  diffRemovedDimmed: 'rgb(253,210,216)',
  diffAddedWord: 'rgb(47,157,68)',
  diffRemovedWord: 'rgb(209,69,75)',
  red_FOR_SUBAGENTS_ONLY: 'rgb(220,50,47)',
  blue_FOR_SUBAGENTS_ONLY: 'rgb(38,139,210)',
  green_FOR_SUBAGENTS_ONLY: 'rgb(133,153,0)',
  yellow_FOR_SUBAGENTS_ONLY: 'rgb(181,137,0)',
  purple_FOR_SUBAGENTS_ONLY: 'rgb(108,113,196)',
  orange_FOR_SUBAGENTS_ONLY: 'rgb(203,75,22)',
  pink_FOR_SUBAGENTS_ONLY: 'rgb(211,54,130)',
  cyan_FOR_SUBAGENTS_ONLY: 'rgb(42,161,152)',
  professionalBlue: 'rgb(106,155,204)',
  chromeYellow: 'rgb(251,188,4)',
  clawd_body: 'rgb(215,119,87)',
  clawd_background: 'rgb(0,0,0)',
  userMessageBackground: 'rgb(240, 240, 240)',
  userMessageBackgroundHover: 'rgb(252, 252, 252)',
  messageActionsBackground: 'rgb(232, 236, 244)',
  selectionBg: 'rgb(180, 213, 255)',
  bashMessageBackgroundColor: 'rgb(250, 245, 250)',
  memoryBackgroundColor: 'rgb(230, 245, 250)',
  rate_limit_fill: 'rgb(38,139,210)',
  rate_limit_empty: 'rgb(39,47,111)',
  fastMode: 'rgb(255,106,0)',
  fastModeShimmer: 'rgb(255,150,50)',
  briefLabelYou: 'rgb(37,99,235)',
  briefLabelClaude: 'rgb(215,119,87)',
  rainbow_red: 'rgb(235,95,87)',
  rainbow_orange: 'rgb(245,139,87)',
  rainbow_yellow: 'rgb(250,195,95)',
  rainbow_green: 'rgb(145,200,130)',
  rainbow_blue: 'rgb(130,170,220)',
  rainbow_indigo: 'rgb(155,130,200)',
  rainbow_violet: 'rgb(200,130,180)',
  rainbow_red_shimmer: 'rgb(250,155,147)',
  rainbow_orange_shimmer: 'rgb(255,185,137)',
  rainbow_yellow_shimmer: 'rgb(255,225,155)',
  rainbow_green_shimmer: 'rgb(185,230,180)',
  rainbow_blue_shimmer: 'rgb(180,205,240)',
  rainbow_indigo_shimmer: 'rgb(195,180,230)',
  rainbow_violet_shimmer: 'rgb(230,180,210)',
}

// ============================================================================
// Theme Resolution
// ============================================================================

export function getTheme(themeName: ThemeName): Theme {
  switch (themeName) {
    case 'light':
      return lightTheme
    case 'light-ansi':
      return lightAnsiTheme
    case 'dark-ansi':
      return darkAnsiTheme
    case 'light-daltonized':
      return lightDaltonizedTheme
    case 'dark-daltonized':
      return darkDaltonizedTheme
    case 'dracula':
      return draculaTheme
    case 'catppuccin':
      return catppuccinTheme
    case 'nord':
      return nordTheme
    case 'gruvbox':
      return gruvboxTheme
    case 'tokyo-night':
      return tokyoNightTheme
    case 'one-dark':
      return oneDarkTheme
    case 'solarized-dark':
      return solarizedDarkTheme
    case 'solarized-light':
      return solarizedLightTheme
    default:
      return darkTheme
  }
}

// Create a chalk instance with 256-color level for Apple Terminal
// Apple Terminal doesn't handle 24-bit color escape sequences well
const chalkForChart =
  env.terminal === 'Apple_Terminal'
    ? new Chalk({ level: 2 }) // 256 colors
    : chalk

/**
 * Converts a theme color to an ANSI escape sequence for use with asciichart.
 * Uses chalk to generate the escape codes, with 256-color mode for Apple Terminal.
 */
export function themeColorToAnsi(themeColor: string): string {
  const rgbMatch = themeColor.match(/rgb\(\s?(\d+),\s?(\d+),\s?(\d+)\s?\)/)
  if (rgbMatch) {
    const r = parseInt(rgbMatch[1]!, 10)
    const g = parseInt(rgbMatch[2]!, 10)
    const b = parseInt(rgbMatch[3]!, 10)
    // Use chalk.rgb which auto-converts to 256 colors when level is 2
    // Extract just the opening escape sequence by using a marker
    const colored = chalkForChart.rgb(r, g, b)('X')
    return colored.slice(0, colored.indexOf('X'))
  }
  // Fallback to magenta if parsing fails
  return '\x1b[35m'
}
