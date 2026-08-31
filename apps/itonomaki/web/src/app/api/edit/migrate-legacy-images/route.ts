import { NextResponse } from "next/server";
import { checkPassword } from "@/lib/editAuth";
import { uploadRawAtFilename } from "@/lib/ftpImages";

// One-time migration: copies every photo/PDF still referenced from
// notion_sync/content that lives on the old Xserver host (acc-pg.com) over
// to the new Lolipop host, byte-for-byte and under the exact same filename.
// Preserving the filename means the markdown content doesn't need any
// per-file changes — only a find/replace of the host in the two files that
// reference it (フィジカル/血液検査.md, フィジカル/筋肉図.md).
//
// No Xserver credentials needed — the old files are served as plain public
// HTTPS. The filename list below was extracted once (2026-08-31) from every
// https://acc-pg.com/library-images/... reference in notion_sync/content;
// it won't pick up new references added after that, but nothing should be
// uploading to acc-pg.com anymore since ftpImages.ts now points at Lolipop.
// Safe to re-run. Delete this route once the migration is confirmed done.
const LEGACY_BASE_URL = "https://acc-pg.com/library-images";

const LEGACY_FILENAMES = [
  "1786495420467-IMG_0123.jpg",
  "1786495426411-IMG_0140.jpg",
  "1786495432592-IMG_0146.jpg",
  "1786495438908-IMG_0151.jpg",
  "1786495445543-IMG_0152.jpg",
  "1786495451171-IMG_0157.jpg",
  "1786495456732-IMG_0158.jpg",
  "1786495462291-IMG_0161.jpg",
  "1786495468471-IMG_0163.jpg",
  "1786495473951-IMG_0166.jpg",
  "1786495480291-IMG_0167.jpg",
  "1786495485931-IMG_0170.jpg",
  "1786495491212-IMG_0171.jpg",
  "1786495496307-IMG_0176.jpg",
  "1786495502205-IMG_0182.jpg",
  "1786495508372-IMG_0198.jpg",
  "1786495513991-IMG_0199.jpg",
  "1786495519203-IMG_0201.jpg",
  "1786495524493-IMG_0205.jpg",
  "1786495530132-IMG_0207.jpg",
  "1786495535745-IMG_0210.jpg",
  "1786495541423-IMG_0222.jpg",
  "1786495547273-IMG_0228.jpg",
  "1786495553126-IMG_0230.jpg",
  "1786495558334-IMG_0237.jpg",
  "1786495564112-IMG_0239.jpg",
  "1786495570083-IMG_0258.jpg",
  "1786495575490-IMG_0263.jpg",
  "1786495581344-IMG_0264.jpg",
  "1786495587450-IMG_0270.jpg",
  "1786495593287-IMG_0271.jpg",
  "1786495598925-IMG_0273.jpg",
  "1786495605005-IMG_0304.jpg",
  "1786495610691-IMG_0315.jpg",
  "1786495617312-IMG_0328.jpg",
  "1786495622695-IMG_0341.jpg",
  "1786495628233-IMG_0348.jpg",
  "1786495633750-IMG_0115.jpg",
  "1786495639524-IMG_0116.jpg",
  "1786495645591-IMG_0124.jpg",
  "1786495650411-IMG_0128.jpg",
  "1786495656403-IMG_0139.jpg",
  "1786495662364-IMG_0143.jpg",
  "1786495667567-IMG_0145.jpg",
  "1786495673154-IMG_0147.jpg",
  "1786495679358-IMG_0149.jpg",
  "1786495685193-IMG_0150.jpg",
  "1786495691753-IMG_0153.jpg",
  "1786495697948-IMG_0160.jpg",
  "1786495704391-IMG_0162.jpg",
  "1786495709886-IMG_0164.jpg",
  "1786495716088-IMG_0165.jpg",
  "1786495721933-IMG_0168.jpg",
  "1786495727992-IMG_0169.jpg",
  "1786495733715-IMG_0172.jpg",
  "1786495738864-IMG_0174.jpg",
  "1786495744449-IMG_0177.jpg",
  "1786495749708-IMG_0178.jpg",
  "1786495755129-IMG_0197.jpg",
  "1786495760473-IMG_0202.jpg",
  "1786495766824-IMG_0203.jpg",
  "1786495772305-IMG_0204.jpg",
  "1786495777754-IMG_0206.jpg",
  "1786495783149-IMG_0225.jpg",
  "1786495787986-IMG_0226.jpg",
  "1786495793332-IMG_0231.jpg",
  "1786495798452-IMG_0233.jpg",
  "1786495804251-IMG_0234.jpg",
  "1786495810127-IMG_0235.jpg",
  "1786495816092-IMG_0236.jpg",
  "1786495821454-IMG_0240.jpg",
  "1786495827586-IMG_0250.jpg",
  "1786495833068-IMG_0251.jpg",
  "1786495839074-IMG_0259.jpg",
  "1786495844507-IMG_0265.jpg",
  "1786495850147-IMG_0266.jpg",
  "1786495855853-IMG_0269.jpg",
  "1786495861192-IMG_0272.jpg",
  "1786495867824-IMG_0275.jpg",
  "1786495873509-IMG_0276.jpg",
  "1786495879854-IMG_0278.jpg",
  "1786495886070-IMG_0280.jpg",
  "1786495892633-IMG_0281.jpg",
  "1786495898448-IMG_0284.jpg",
  "1786495904848-IMG_0285.jpg",
  "1786495910412-IMG_0288.jpg",
  "1786495915714-IMG_0290.jpg",
  "1786495922005-IMG_0294.jpg",
  "1786495927813-IMG_0295.jpg",
  "1786495934048-IMG_0296.jpg",
  "1786495940167-IMG_0297.jpg",
  "1786495945907-IMG_0298.jpg",
  "1786495951273-IMG_0300.jpg",
  "1786495956993-IMG_0301.jpg",
  "1786495963033-IMG_0302.jpg",
  "1786495968467-IMG_0305.jpg",
  "1786495974486-IMG_0306.jpg",
  "1786495980493-IMG_0308.jpg",
  "1786495986108-IMG_0310.jpg",
  "1786495991888-IMG_0311.jpg",
  "1786495997534-IMG_0319.jpg",
  "1786496003533-IMG_0337.jpg",
  "1786496009194-IMG_0340.jpg",
  "1786496015513-IMG_0343.jpg",
  "1786496021947-IMG_0344.jpg",
  "1786496028471-IMG_0345.jpg",
  "1786496033888-IMG_0346.jpg",
  "1786496039333-IMG_0350.jpg",
  "1786496044684-IMG_0351.jpg",
  "1786496050794-IMG_0355.jpg",
  "1786496056954-IMG_0358.jpg",
  "1786496063186-IMG_0359.jpg",
  "1786496068687-IMG_0360.jpg",
  "1786496074993-IMG_0362.jpg",
  "1786496080605-IMG_0368.jpg",
  "1786496086590-IMG_0309.jpg",
  "1786496092145-IMG_0316.jpg",
  "1786496097868-IMG_0317.jpg",
  "1786496103694-IMG_0320.jpg",
  "1786496109489-IMG_0330.jpg",
  "1786496115195-IMG_0347.jpg",
  "1786496120532-IMG_0361.jpg",
  "1786525382739-08-12-180041.jpg",
  "1786533183543-file.pdf",
];

function requireEditToken(request: Request): boolean {
  const header = request.headers.get("authorization") ?? "";
  const provided = header.startsWith("Bearer ") ? header.slice("Bearer ".length) : "";
  return checkPassword(provided);
}

export async function POST(request: Request) {
  if (!requireEditToken(request)) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }

  const migrated: string[] = [];
  const failed: { filename: string; error: string }[] = [];

  for (const filename of LEGACY_FILENAMES) {
    try {
      const fileRes = await fetch(`${LEGACY_BASE_URL}/${filename}`, { cache: "no-store" });
      if (!fileRes.ok) throw new Error(`ファイル取得失敗(status: ${fileRes.status})`);
      const buffer = Buffer.from(await fileRes.arrayBuffer());
      await uploadRawAtFilename(buffer, filename);
      migrated.push(filename);
    } catch (err) {
      failed.push({ filename, error: err instanceof Error ? err.message : String(err) });
    }
  }

  return NextResponse.json({
    totalInList: LEGACY_FILENAMES.length,
    migratedCount: migrated.length,
    migrated,
    failedCount: failed.length,
    failed,
  });
}
