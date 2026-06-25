import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      selectedTeamName,
      group,
      scenario,
      opponentGroup,
      opponentGroupPlaceholder,
      groupStandings,
      remainingMatches,
      mode,
    } = body;

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          english: "⚠️ Gemini API key is missing. Please add GEMINI_API_KEY to your environment variables (.env.local) to enable dynamic qualification scenarios.",
          bengali: "⚠️ জেমিনি এপিআই কি (API key) পাওয়া যায়নি। ডাইনামিক ম্যাচের সমীকরণ সচল করতে দয়া করে আপনার .env.local ফাইলে GEMINI_API_KEY যুক্ত করুন।"
        },
        { status: 200 } // Return as status 200 so the UI displays it as a helpful instruction rather than failing
      );
    }

    let finalRemainingMatches = remainingMatches;

    if (mode === 'fifa') {
      try {
        const gamesResponse = await fetch('https://worldcup26.ir/get/games');
        if (gamesResponse.ok) {
          const gamesData = await gamesResponse.json();
          const gamesList = gamesData.games || [];
          
          const opponentGroupsList = opponentGroup.split('/');
          const unplayedGames = gamesList.filter(
            (g: any) => g.finished !== 'TRUE' && g.finished !== 'true' && g.type === 'group' && opponentGroupsList.includes(g.group)
          );
          
          finalRemainingMatches = unplayedGames.map((g: any) => ({
            group: g.group,
            homeTeam: g.home_team_name_en,
            awayTeam: g.away_team_name_en
          }));
        }
      } catch (e) {
        console.error("Error fetching games from API on server side:", e);
      }
    }

    const prompt = `You are an expert, factually precise FIFA World Cup 2026 analyst.
The user is tracking the road to the final for: ${selectedTeamName} (Group ${group} finishing ${scenario}).
Their Round of 32 opponent placeholder is: ${opponentGroupPlaceholder}.

Here is the current table dataset for the opponent's group:
${JSON.stringify(groupStandings, null, 2)}

Remaining unplayed matches in this group:
${JSON.stringify(finalRemainingMatches, null, 2)}

Provide a highly concise, accurate qualification analysis in both English and Bengali. 

You MUST follow these strict formatting and content rules:
1. **Rule Statement on First Line**: The very first line of the output MUST clearly state which group ${selectedTeamName} is in, and who they will face in the Round of 32 based on the opponent placeholder (${opponentGroupPlaceholder}).
   - In English: "Your team <selected>${selectedTeamName}</selected> is in Group ${group} (finishing ${scenario}) and will play the ${opponentGroupPlaceholder} (e.g., if ${opponentGroupPlaceholder} is '2H', explain it means 'Group H Runner-up'; if '1H', 'Group H Winner'; if '3A/B/C', 'one of the best 3rd placed teams from Groups A, B, or C') in the Round of 32."
   - In Bengali: "আপনার দল <selected>${selectedTeamName}</selected> গ্রুপ ${group} (finishing ${scenario})-এ রয়েছে এবং রাউন্ড অফ ৩২-এ ${opponentGroupPlaceholder} (যেমন: ${opponentGroupPlaceholder} যদি '2H' হয়, তার মানে 'গ্রুপ H এর রানার-আপ'; '1H' হলে 'গ্রুপ H এর চ্যাম্পিয়ন'; '3A/B/C' হলে 'গ্রুপ A, B অথবা C এর অন্যতম সেরা ৩য় স্থান অর্জনকারী দল') এর মুখোমুখি হবে।"
   - Make this statement the absolute first line of both "english" and "bengali" fields, without any introduction before it.
2. **Tag Searched and Other Countries**:
   - Wrap the searched team name (which is ${selectedTeamName}) in <selected>...</selected> tags whenever it appears in the text. E.g. <selected>${selectedTeamName}</selected>.
   - Wrap ALL other country/team names (e.g., Netherlands, Japan, Sweden, Tunisia, USA, Mexico, or their Bengali equivalents like নেদারল্যান্ডস, জাপান, সুইডেন, তিউনিসিয়া) in <country>...</country> tags whenever they appear in the text. E.g., <country>Netherlands</country> or <country>নেদারল্যান্ডস</country>.
3. **Absolutely No Markdown Formatting**: Do NOT use double asterisks (**), single asterisks (*), underscores (_), or hyphens (-) anywhere in the text to bold, italicize, or style words (such as team names, group names, or titles). The UI does not support markdown styling, so these characters will show up as literal text and look ugly. E.g., do not write **Netherlands**, write <country>Netherlands</country>.
4. **No Markdown Bullets**: Do NOT use asterisks (*) or hyphens (-) as list item prefixes/bullets anywhere in the output. Standard bullet lists like "* Item" or "- Item" are strictly forbidden. Use ONLY colorful emojis (e.g., ⚽, 📊, 🏆, 🔄) to separate or begin points.
5. **Clean Paragraph/Emoji Layout**: Keep each sentence or point on a new line starting directly with a colorful emoji, for example:
   ⚽ <country>Team Name</country>: Condition details.
   📊 Current State: Condition details.
6. **No nested list symbols**: Do not prefix nested items or descriptions with asterisks (*). Simply write them as clean, emoji-prefixed paragraphs.

Your output must be in raw JSON format matching this schema:
{
  "english": "Your team <selected>${selectedTeamName}</selected> is in Group ${group} (finishing ${scenario}) and will play the [EXPLAINED PLACEHOLDER] in the Round of 32.\\n\\n⚽ <country>Team Name</country>: details...",
  "bengali": "আপনার দল <selected>${selectedTeamName}</selected> গ্রুপ ${group} (finishing ${scenario})-এ রয়েছে এবং রাউন্ড অফ ৩২-এ [EXPLAINED PLACEHOLDER] এর মুখোমুখি হবে।\\n\\n⚽ <country>দল</country>: বিবরণ..."
}
Make sure you ONLY return the JSON object, with no markdown formatting tags like \`\`\`.`;

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt,
              },
            ],
          },
        ],
        generationConfig: {
          responseMimeType: 'application/json',
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMsg = `Gemini API returned status ${response.status}`;
      try {
        const errorJson = JSON.parse(errorText);
        if (errorJson.error?.message) {
          errorMsg = errorJson.error.message;
        }
      } catch (e) {
        if (errorText) {
          errorMsg += `: ${errorText.substring(0, 150)}`;
        }
      }
      throw new Error(errorMsg);
    }

    const responseData = await response.json();
    const generatedText = responseData.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!generatedText) {
      throw new Error("Invalid response structure from Gemini API");
    }

    // Parse the JSON returned by Gemini
    const result = JSON.parse(generatedText.trim());

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Error in scenarios API:", error);
    
    let englishMsg = "";
    let bengaliMsg = "";
    const errMsgStr = String(error.message || error).toLowerCase();

    if (
      errMsgStr.includes("429") || 
      errMsgStr.includes("quota") || 
      errMsgStr.includes("exhausted") || 
      errMsgStr.includes("rate limit")
    ) {
      englishMsg = "⚠️ API Quota Limit Reached. You have temporarily exceeded the free-tier request limit for Gemini API. Please try again in 1 minute.";
      bengaliMsg = "⚠️ এপিআই কোটার সীমা অতিক্রম হয়েছে। আপনি সাময়িকভাবে জেমিনি এপিআই-এর ফ্রি-টিয়ার অনুরোধের সীমা অতিক্রম করেছেন। দয়া করে ১ মিনিট পর আবার চেষ্টা করুন।";
    } else if (
      errMsgStr.includes("400") || 
      errMsgStr.includes("api key") || 
      errMsgStr.includes("invalid key") || 
      errMsgStr.includes("key_invalid")
    ) {
      englishMsg = "⚠️ Invalid API Key. The provided GEMINI_API_KEY is invalid or restricted. Please check your credentials in .env.local.";
      bengaliMsg = "⚠️ অবৈধ এপিআই কি। আপনার দেওয়া GEMINI_API_KEY-টি সঠিক নয়। অনুগ্রহ করে .env.local ফাইলে আপনার কি পরীক্ষা করুন।";
    } else {
      englishMsg = `⚠️ Error loading dynamic scenarios: ${error.message || "An unexpected error occurred."}`;
      bengaliMsg = `⚠️ ম্যাচের সমীকরণ লোড করতে সমস্যা হয়েছে: ${error.message || "একটি অপ্রত্যাশিত সমস্যা ঘটেছে।"}`;
    }

    return NextResponse.json(
      {
        english: englishMsg,
        bengali: bengaliMsg,
        isError: true
      },
      { status: 200 }
    );
  }
}
