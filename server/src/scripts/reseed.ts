import { config } from "../config.ts";
import { connect, reseed } from "../db/database.ts";

await connect();
await reseed();

console.log(`Reseeded ${config.dataFile}`);
