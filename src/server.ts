import { env } from "./config/env";
import { app } from "./app";

app.listen(env.port, () => {
  console.log(`Uppsalaflow backend rodando em http://localhost:${env.port}`);
});
