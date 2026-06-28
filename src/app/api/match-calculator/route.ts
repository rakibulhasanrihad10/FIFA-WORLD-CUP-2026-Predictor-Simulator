import { NextResponse } from 'next/server';
import { TEAMS } from '@/data/initialData';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      match,
      simulatedOutcome, // 'home_win' | 'away_win' | 'draw'
      selectedTeamName, // User's team (e.g. Brazil)
      selectedTeamGroup, // Group of user's team (e.g. C)
      simulatedGroupStandings, // Array of team standings for the match's group after applying result
      simulatedBracketIntersection, // { meetingStage: string | null, opponentTeamId: string | null }
      simulatedBracketPaths, // Map of team ID to list of matches
    } = body;

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          english: "⚠️ Gemini API key is missing. Please add GEMINI_API_KEY to your environment variables (.env.local) to enable dynamic scenario commentary.",
          bengali: "⚠️ জেমিনি এপিআই কি (API key) পাওয়া যায়নি। ম্যাচের সমীকরণ বিশ্লেষণ সচল করতে দয়া করে আপনার .env.local ফাইলে GEMINI_API_KEY যুক্ত করুন।"
        },
        { status: 200 }
      );
    }

    const teamRanks = TEAMS.reduce((acc, t) => {
      acc[t.name] = t.rank;
      return acc;
    }, {} as Record<string, number>);

    const prompt = `You are an expert, realistic, and factually precise FIFA World Cup 2026 analyst.
The user is a fan of ${selectedTeamName} (Group ${selectedTeamGroup}).
They are calculating the impact of the match: ${match.homeTeamName} vs ${match.awayTeamName} (Group ${match.groupId}) under the scenario: "${simulatedOutcome === 'home_win' ? `${match.homeTeamName} Win` : simulatedOutcome === 'away_win' ? `${match.awayTeamName} Win` : 'Draw'}".

Here are the details from our tournament simulator:
- **Simulated Standings for Group ${match.groupId}**:
${JSON.stringify(simulatedGroupStandings, null, 2)}

- **Bracket Analysis for ${selectedTeamName}**:
${JSON.stringify(simulatedBracketIntersection, null, 2)}

- **Full Knockout Path Simulation for reference**:
${JSON.stringify(simulatedBracketPaths, null, 2)}

- **Global FIFA Rankings Reference**:
${JSON.stringify(teamRanks)}

Provide an analytical, realistic, and tactical commentary of this scenario in both English and Bengali.

You MUST follow these strict formatting and content rules:
1. **Rule Statement on First Line**: The first line of both translations MUST declare the match result and how it positions the teams in their group, followed by the direct bracket impact on ${selectedTeamName}.
   - Example in English: "If <country>${match.homeTeamName}</country> wins, they finish [POSITION] in Group ${match.groupId}, while <country>${match.awayTeamName}</country> finishes [POSITION]. Under this scenario, <selected>${selectedTeamName}</selected> could face [OPPONENT] in the [STAGE]."
   - Example in Bengali: "যদি <country>${match.homeTeamName}</country> জেতে, তারা গ্রুপ ${match.groupId}-এ [POSITION] অবস্থানে শেষ করবে এবং <country>${match.awayTeamName}</country> [POSITION] অবস্থানে থাকবে। এই সমীকরণে, রাউন্ডগুলোতে <selected>${selectedTeamName}</selected> [STAGE]-এ [OPPONENT] এর মুখোমুখি হতে পারে।"
2. **FIFA Ranking Tactical Comparison**: Compare the FIFA rankings of the potential opponents on the knockout path for <selected>${selectedTeamName}</selected>.
   - Note: A lower rank integer means a stronger team (e.g., Rank 1 is stronger/tougher than Rank 20).
   - If this outcome results in facing lower-ranked/weaker teams (higher rank integer) in early knockout rounds (Round of 32, Round of 16, Quarter-finals, or Semi-finals), explain that this is a favorable scenario because it extends/improves the opportunity to reach the Final.
   - Acknowledge that competing with a tough opponent (lower rank integer) in the Final is perfectly acceptable and expected.
   - If the early path becomes tougher (i.e. facing teams with smaller rank integers earlier on), explain why this outcome presents a difficult bottleneck early on.
3. **Avoid Flowery Fillers**: Do NOT use generic flowery introductory or filler phrases (such as "Ah, a draw!", "And the plot thickens!"). Focus the commentary strictly on the logical/tactical comparison of FIFA rankings and path outcomes.
4. **Tag Searched and Other Countries**:
   - Wrap the user's favorite team name (${selectedTeamName}) in <selected>...</selected> tags whenever it appears in the text. E.g. <selected>${selectedTeamName}</selected>.
   - Wrap ALL other country/team names (e.g., France, Norway, Senegal, Argentina, Brazil) in <country>...</country> tags whenever they appear in the text (both in English and Bengali). E.g., <country>Norway</country> or <country>নরওয়ে</country>.
5. **Absolutely No Markdown Formatting**: Do NOT use double asterisks (**), single asterisks (*), underscores (_), or hyphens (-) anywhere in the text to bold, italicize, or style words. The UI does not support markdown styling, so these characters will show up as literal text and look ugly. E.g., do not write **Norway**, write <country>Norway</country>.
6. **No Markdown Bullets**: Do NOT use asterisks (*) or hyphens (-) as list item prefixes/bullets anywhere in the output. Standard bullet lists like "* Item" or "- Item" are strictly forbidden. Use ONLY colorful emojis (e.g., ⚽, 📊, 🏆, 🔄) to separate or begin points.
7. **Clean Paragraph/Emoji Layout**: Keep each sentence or point on a new line starting directly with a colorful emoji, for example:
   ⚽ <country>Norway</country>: details...
   📊 Current State: details...
8. **No nested list symbols**: Do not prefix nested items or descriptions with asterisks (*). Simply write them as clean, emoji-prefixed paragraphs.

Your output must be in raw JSON format matching this schema:
{
  "english": "If <country>${match.homeTeamName}</country> wins...\\n\\n⚽ details...",
  "bengali": "যদি <country>${match.homeTeamName}</country> জেতে...\\n\\n⚽ বিবরণ..."
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

    const result = JSON.parse(generatedText.trim());
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Error in match-calculator API:", error);
    
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
      englishMsg = `⚠️ Error loading scenario commentary: ${error.message || "An unexpected error occurred."}`;
      bengaliMsg = `⚠️ সমীকরণের বিবরণ লোড করতে সমস্যা হয়েছে: ${error.message || "একটি অপ্রত্যাশিত সমস্যা ঘটেছে।"}`;
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
