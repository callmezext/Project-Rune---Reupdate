import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import SiteSetting from "@/models/SiteSetting";

// POST — send embed message to a Discord channel
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session.isLoggedIn || session.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { channelId, embeds, components } = await req.json();

    if (!channelId) {
      return NextResponse.json({ error: "channelId is required" }, { status: 400 });
    }

    await connectDB();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const settings: any = await SiteSetting.findOne().lean();
    const token = settings?.discordBotToken || process.env.DISCORD_BOT_TOKEN || "";

    if (!token) {
      return NextResponse.json({ error: "Bot token not configured" }, { status: 400 });
    }

    // Process and group all embeds into a single message payload
    let content = "";
    const validEmbeds = [];
    const buttons = [];

    for (const e of embeds) {
      // Use the first non-empty content we find for the top-level message content
      if (e.content && !content) {
        content = e.content;
      }

      // Collect buttons
      if (e.buttons && Array.isArray(e.buttons)) {
        buttons.push(...e.buttons);
      }

      // Check if it has actual embed fields
      const hasFields = e.title || e.description || e.thumbnail?.url || e.image?.url || e.footer?.text || e.author?.name || e.fields?.length || e.timestamp;
      
      if (hasFields) {
        const cleanedEmbed: Record<string, any> = {};
        if (e.title) cleanedEmbed.title = e.title;
        if (e.description) cleanedEmbed.description = e.description;
        if (typeof e.color === "number") cleanedEmbed.color = e.color;
        if (e.thumbnail?.url) cleanedEmbed.thumbnail = { url: e.thumbnail.url };
        if (e.image?.url) cleanedEmbed.image = { url: e.image.url };
        
        if (e.footer?.text) {
          cleanedEmbed.footer = { 
            text: e.footer.text, 
            icon_url: e.footer.icon_url || undefined 
          };
        }
        
        if (e.author?.name) {
          cleanedEmbed.author = {
            name: e.author.name,
            icon_url: e.author.icon_url || undefined,
            url: e.author.url || undefined
          };
        }
        
        if (e.fields?.length) {
          cleanedEmbed.fields = e.fields
            .filter((f: any) => f.name && f.value)
            .map((f: any) => ({ name: f.name, value: f.value, inline: !!f.inline }));
        }
        
        if (e.timestamp) cleanedEmbed.timestamp = e.timestamp;
        
        validEmbeds.push(cleanedEmbed);
      }
    }

    if (!content && validEmbeds.length === 0 && (!components || !components.length)) {
      return NextResponse.json({ error: "Message must have content, at least one non-empty embed, or components" }, { status: 400 });
    }

    const payload: Record<string, any> = {};
    if (content) payload.content = content;
    if (validEmbeds.length > 0) payload.embeds = validEmbeds;

    if (components && Array.isArray(components) && components.length > 0) {
      // Validate components array
      for (let rIdx = 0; rIdx < components.length; rIdx++) {
        const row = components[rIdx];
        if (!row || row.type !== 1 || !Array.isArray(row.components)) {
          return NextResponse.json({ error: `Format Action Row #${rIdx + 1} tidak valid.` }, { status: 400 });
        }
        for (let cIdx = 0; cIdx < row.components.length; cIdx++) {
          const comp = row.components[cIdx];
          if (comp.type === 2) {
            // Button
            if (!comp.label || !comp.label.trim()) {
              return NextResponse.json({ error: `Tombol pada Action Row #${rIdx + 1} posisi #${cIdx + 1} memerlukan label.` }, { status: 400 });
            }
            if (comp.style === 5) {
              let url = (comp.url || "").trim();
              if (!url || url === "https://" || url === "https" || url === "http://" || url === "http") {
                return NextResponse.json({ error: `Tombol "${comp.label}" memerlukan URL redirect yang valid.` }, { status: 400 });
              }
              if (!/^https?:\/\//i.test(url)) {
                url = `https://${url}`;
              }
              try {
                new URL(url);
                comp.url = url;
              } catch {
                return NextResponse.json({ error: `URL "${url}" pada tombol "${comp.label}" tidak valid.` }, { status: 400 });
              }
            } else {
              if (!comp.custom_id || !comp.custom_id.trim()) {
                return NextResponse.json({ error: `Tombol "${comp.label}" memerlukan Custom ID.` }, { status: 400 });
              }
            }
          } else if (comp.type === 3) {
            // Select menu
            if (!comp.custom_id || !comp.custom_id.trim()) {
              return NextResponse.json({ error: `Dropdown menu pada Action Row #${rIdx + 1} memerlukan Custom ID.` }, { status: 400 });
            }
            if (!comp.options || !Array.isArray(comp.options) || comp.options.length === 0) {
              return NextResponse.json({ error: `Dropdown menu pada Action Row #${rIdx + 1} wajib memiliki opsi.` }, { status: 400 });
            }
            for (let oIdx = 0; oIdx < comp.options.length; oIdx++) {
              const opt = comp.options[oIdx];
              if (!opt.label || !opt.label.trim()) {
                return NextResponse.json({ error: `Opsi #${oIdx + 1} pada Dropdown "${comp.placeholder || "Menu"}" memerlukan label.` }, { status: 400 });
              }
              if (!opt.value || !opt.value.trim()) {
                return NextResponse.json({ error: `Opsi "${opt.label}" memerlukan aksi / nilai balasan.` }, { status: 400 });
              }
            }
          }
        }
      }
      payload.components = components;
    } else if (buttons.length > 0) {
      // Validate buttons first
      for (const b of buttons) {
        const style = parseInt(b.style) || 5;
        if (style === 5) {
          let finalUrl = (b.url || "").trim();
          if (!finalUrl || finalUrl === "https://" || finalUrl === "http://") {
            return NextResponse.json({ error: `Tombol "${b.label || "Link"}" memerlukan URL yang valid.` }, { status: 400 });
          }
          if (!/^https?:\/\//i.test(finalUrl)) {
            finalUrl = `https://${finalUrl}`;
          }
          try {
            new URL(finalUrl);
          } catch {
            return NextResponse.json({ error: `URL "${finalUrl}" pada tombol "${b.label || "Link"}" tidak valid.` }, { status: 400 });
          }
        } else {
          const customId = b.customId || b.custom_id;
          if (!customId || !customId.trim()) {
            return NextResponse.json({ error: `Tombol "${b.label || "Button"}" memerlukan Custom ID.` }, { status: 400 });
          }
        }
      }

      const componentRows = [];
      const buttonLimit = 5;
      
      for (let i = 0; i < buttons.length; i += buttonLimit) {
        const chunk = buttons.slice(i, i + buttonLimit);
        const rowComponents = chunk.map((b: any) => {
          const style = parseInt(b.style) || 5;
          const btn: Record<string, any> = {
            type: 2,
            style: style,
            label: b.label || "Button"
          };
          
          if (style === 5) {
            let finalUrl = b.url.trim();
            if (!/^https?:\/\//i.test(finalUrl)) {
              finalUrl = `https://${finalUrl}`;
            }
            btn.url = finalUrl;
          } else {
            btn.custom_id = b.customId || b.custom_id || `btn_${Math.random().toString(36).slice(2)}`;
          }
          
          if (b.emoji) btn.emoji = { name: b.emoji };
          return btn;
        });

        componentRows.push({
          type: 1,
          components: rowComponents
        });
      }
      
      payload.components = componentRows.slice(0, 5); // Max 5 action rows
    }

    const res = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bot ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ success: false, error: err }, { status: 400 });
    }

    const msg = await res.json();
    return NextResponse.json({
      success: true,
      results: [{ success: true, messageId: msg.id }],
      message: "Message sent!",
    });
  } catch (error) {
    console.error("[Discord Send]", error);
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
  }
}
