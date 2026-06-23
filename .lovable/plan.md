## Video availability audit

Checked all 40 YouTube videos in `src/data/curriculum.ts` via the YouTube oEmbed API.

**Result: 39/40 available. 1 broken.**

| Branch | Lesson | Video ID | Status |
|---|---|---|---|
| Video Editing | "Cuts, B-Roll and Pacing" (line 549) | `aQpQGRRGZNo` | 404 — removed by uploader |

All other branches (Web Dev, Game Dev, AI & Automation, Freelancing, Content Creation, Graphic Design, Blender) pass.

## Fix

Replace the broken video with a verified, on-topic alternative:

- **New video:** Katie Steckly — *"Give me 10 minutes and I'll make your editing 10x better"* (`ivhHHoLXy4s`)
- **Why it fits:** Beginner-friendly, covers cuts, B-roll and pacing in ~10 minutes, matches the lesson's intro and challenge wording. Channel is established and the video is publicly embeddable.

Single line change at `src/data/curriculum.ts:549`:

```ts
videoUrl: yt("ivhHHoLXy4s"),
```

No other edits needed.
