import { Config } from '@remotion/cli/config';

Config.setVideoImageFormat('jpeg');
Config.setOverwriteOutput(true);

// Linux headless Chromium: avoid single-process crashes; use software GL.
// Remotion also always launches with --no-sandbox, --disable-setuid-sandbox,
// and --disable-dev-shm-usage (see @remotion/renderer openBrowser).
Config.setChromiumOpenGlRenderer('swiftshader');
Config.setChromiumMultiProcessOnLinux(true);
Config.setChromiumDisableWebSecurity(true);
