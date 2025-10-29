import React from 'react';
import './App.css';
import { marked } from 'marked'; // Import marked

// Import chart components
import MessageCountChart from './components/MessageCountChart';
import HourlyActivityChart from './components/HourlyActivityChart';
import DailyActivityChart from './components/DailyActivityChart';

const markdownContent = `
# WhatsApp Chat Analysis

## Chat Timespan

The chat history is from **June 11, 2025** to **October 29, 2025**.

## Message Count per Person

*   **Unde**: 2961 messages
*   **Marius Motoi**: 2429 messages
*   **Baldo**: 1164 messages
*   **Vasile**: 705 messages
*   **R**: 294 messages
*   **Meta AI**: 4 messages
*   **ChatGPT**: 3 messages
*   **You**: 1 message

## Average Messages Per Day

The chat spans **141 days** (from June 11, 2025, to October 29, 2025). Based on this, here is the approximate average number of messages per day for each person:

*   **Unde**: 21.0 messages/day
*   **Marius Motoi**: 17.2 messages/day
*   **Baldo**: 8.3 messages/day
*   **Vasile**: 5.0 messages/day
*   **R**: 2.1 messages/day
*   **Meta AI**: ~0.03 messages/day
*   **ChatGPT**: ~0.02 messages/day
*   **You**: ~0.01 messages/day

## General Conversation Topics

Based on the chat log, the conversation is very informal and covers a wide range of topics typical of a group of close friends. Here's a summary of what they generally talk about:

*   **Socializing and Making Plans:** A large part of the conversation revolves around planning get-togethers, deciding where to go out, and coordinating activities like playing poker or going to parties. They seem to use Discord frequently for these arrangements.

*   **Gambling, especially Poker:** Poker is a recurring and central theme. They discuss their games, wins and losses, and share stories about their experiences at poker rooms and online.

*   **Jokes, Banter, and Memes:** The chat is filled with friendly banter, inside jokes, and the sharing of memes, funny videos, and links. The tone is very casual and humorous.

*   **Food and Drink:** There are frequent discussions about food, including preferences for pizza and shawarma, and talk about various alcoholic and non-alcoholic drinks.

*   **Daily Life and Work:** They share anecdotes from their daily lives, talk about work, and discuss personal projects, such as creating a video game.

*   **Technology and Pop Culture:** The group discusses various tech-related subjects, including software like CapCut and Canva, computer issues, and video games. They also share and comment on music and other pop culture content.

*   **Relationships and Personal Matters:** While often discussed in a joking manner, there are mentions of relationships, girlfriends, and other personal aspects of their lives.

The language is a mix of Romanian and English, with a heavy use of slang and colloquialisms, reflecting the close and informal nature of the group.

## Fun Deductions

Based on the chat history, here are a few more fun deductions:

### 1. Inside Jokes and Recurring Themes

Several inside jokes and recurring themes appear throughout the conversation, painting a picture of the group's unique shared humor:

*   **Poker as a Metaphor for Life:** The friends frequently use poker terminology and analogies to describe everyday situations, from personal relationships to work challenges. Winning or losing at poker is a common topic, and it seems to be a central bonding activity.
*   **"Romanian Soul Bites":** This phrase appears multiple times, often in a humorous or ironic context. It seems to be a catchphrase for a certain type of experience or feeling that the group understands.
*   **Character Archetypes:** The friends have created archetypes and running jokes about each other's personalities. For example, they joke about "R" being a tech guru who can fix anything and "Marius Motoi" being an expressive and sometimes dramatic storyteller.
*   **Tech Support and Mishaps:** There's a running theme of technology-related problems, especially with one member, "Robert," who is jokingly banned from using other people's devices due to the chaos that ensues.

### 2. Group Dynamics and Roles

*   **The Planner:** **Unde** often takes the lead in organizing get-togethers and activities, especially poker nights. They are frequently the one to initiate plans and check in with the group.
*   **The Entertainer:** **Marius Motoi** seems to be the group's primary entertainer, frequently sharing funny stories, making self-deprecating jokes, and keeping the mood light.
*   **The Voice of Reason (and Tech Support):** **R** often chimes in with practical advice, especially on technical matters. They are the go-to person for explaining complex topics, from software licensing to fixing computer problems.

### 3. Lifestyle and Habits

*   **Night Owls:** The chat history shows a significant amount of activity late at night and even into the early hours of the morning, suggesting that the group members are often up late, especially when playing poker or socializing.
*   **Spontaneous Get-Togethers:** While they do plan some events, many of their social interactions seem to be spontaneous, with members frequently checking who is available to hang out on short notice.
*   **A Mix of Digital and In-Person Interaction:** The group seamlessly moves between online and offline worlds. They use the chat to plan in-person meetings, and then often report back to the group with stories and updates from those events.

## Comprehensive Analysis

### 1. Peak Activity Analysis

*   **Most Active Hours of the Day:** The group is most active in the evening and late at night, with a significant peak between **8 PM and 10 PM**.
*   **Most Active Days of the Week:** The group is most active on the weekends, with **Sunday** being the most active day.

### 2. Inside Joke and Slang "Dictionary"

*   **"Disconcea?" / "Discsos" / "Doxxco":** A playful and ever-changing set of slang for "Discord."
*   **"Romanian Soul Bites":** A catchphrase for anything stereotypically Romanian.
*   **"The Robert Saga":** A running joke about a friend named Robert who is comically bad with technology.
*   **"French Context":** An inside joke that is never explained to outsiders.
*   **"Cucamonu":** A slang term for "cu camionul" (with the truck).
*   **"Jizzy Boy Lemuriano" / "Masilur":** Affectionate and humorous nicknames for members of the group.
*   **"Simeticoane":** A made-up word used in a variety of nonsensical but humorous contexts.

### 3. Social Interaction Map

*   **Main Hubs:** **Unde** and **Marius Motoi** are the main hubs of the conversation.
*   **Key Pairings:** The most frequent conversational pairings are between **Unde**, **Marius Motoi**, and **Baldo**.
*   **Role of Others:** **Vasile** and **R** are active participants, with **R** often acting as a source of technical information.

### 4. Topic Frequency Analysis

1.  **Socializing and Banter:** The most dominant category.
2.  **Poker and Gambling:** A central and recurring topic.
3.  **Food and Drink:** Frequent discussions about meals and drinks.
4.  **Work and Technology:** Common, but less frequent than social topics.

### 5. Linguistic Fingerprints

*   **Unde:** Concise, inventive slang, and dry humor.
*   **Marius Motoi:** Expressive, emotional, and uses self-deprecating humor.
*   **Baldo:** Witty, observational, and sarcastic.
*   **R:** Formal, technical, and has a dry sense of humor.
*   **Vasile:** Direct, to the point, and enthusiastic.
`;

function App() {
  const htmlContent = marked.parse(markdownContent); // Convert markdown to HTML

  return (
    <div className="App">
      <div className="terminal-output">
        <div dangerouslySetInnerHTML={{ __html: htmlContent }} />
        <div className="charts-container">
          <div className="chart-item">
            <MessageCountChart />
          </div>
          <div className="chart-item">
            <HourlyActivityChart />
          </div>
          <div className="chart-item">
            <DailyActivityChart />
          </div>
        </div>
        <span className="cursor">_</span> {/* Blinking cursor */}
      </div>
    </div>
  );
}

export default App;
