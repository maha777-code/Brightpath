import { Config } from '@remotion/cli/config';

Config.setVideoImageFormat('jpeg');
Config.setOverwriteOutput(true);

// Three.js / R3F needs WebGL in headless Chrome — prefer ANGLE (not --disable-gpu).
Config.setChromiumOpenGlRenderer('angle');
Config.setChromiumMultiProcessOnLinux(true);
Config.setChromiumDisableWebSecurity(true);
