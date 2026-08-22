import { Config } from '@remotion/cli/config';

Config.setVideoImageFormat('jpeg');
Config.setOverwriteOutput(true);

// Linux headless Chromium: software GL; Remotion injects sandbox flags in openBrowser.
// Prefer swangle; API renderer also retries swiftshader + system Chrome.
Config.setChromiumOpenGlRenderer('swangle');
Config.setChromiumMultiProcessOnLinux(false);
Config.setChromiumDisableWebSecurity(true);
