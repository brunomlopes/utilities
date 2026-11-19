"use client";

import { CheatSheetPage } from "@/tools/cheat-sheets/cheat-sheets";
import { sheets } from "@/tools/cheat-sheets/sheets";

export default function Page() {
  return <CheatSheetPage sheet={sheets[2]} />;
}
