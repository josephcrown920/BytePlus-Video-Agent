#!/usr/bin/env node
// Start the BytePlus Video Agent API server + web UI

import { startServer } from "./server.js";

const port = process.env.PORT || 3000;
startServer(port);
