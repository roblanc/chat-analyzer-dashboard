import React from 'react';
import './App.css';
import { marked } from 'marked'; // Import marked

// Import chart components (these are still imported but not rendered in App.js directly)
import MessageCountChart from './components/MessageCountChart';
import HourlyActivityChart from './components/HourlyActivityChart';
import DailyActivityChart from './components/DailyActivityChart';

const markdownContent = `
░█████████           ░██              ░██                          ░██░██
░██     ░██                           ░██                                
░██     ░██ ░██░████ ░██ ░███████  ░████████  ░███████  ░████████  ░██░██
░█████████  ░███     ░██░██    ░██    ░██    ░██    ░██ ░██    ░██ ░██░██
░██         ░██      ░██░█████████    ░██    ░█████████ ░██    ░██ ░██░██
░██         ░██      ░██░██           ░██    ░██    ░██ ░██    ░██ ░██░██
░██         ░██      ░██ ░███████      ░████  ░███████  ░██    ░██ ░██░██

## Perioada de Chat

Istoricul chat-ului este din **11 iunie 2025** până în **29 octombrie 2025**.

## Număr de Mesaje per Persoană

*   **Unde**: 2961 mesaje
*   **Marius Motoi**: 2429 mesaje
*   **Baldo**: 1164 mesaje
*   **Vasile**: 705 mesaje
*   **R**: 294 mesaje

## Medie Mesaje pe Zi

Chat-ul se întinde pe o perioadă de **141 de zile** (din 11 iunie 2025 până în 29 octombrie 2025). Pe baza acestui fapt, iată numărul mediu aproximativ de mesaje pe zi pentru fiecare persoană:

*   **Unde**: 21.0 mesaje/zi
*   **Marius Motoi**: 17.2 mesaje/zi
*   **Baldo**: 8.3 mesaje/zi
*   **Vasile**: 5.0 mesaje/zi
*   **R**: 2.1 mesaje/zi

## Activitate de Vârf

### Cele Mai Active Ore ale Zilei
Grupul este cel mai activ seara și târziu în noapte, cu un vârf semnificativ între orele **20:00 - 21:00** (704 mesaje).

### Cele Mai Active Zile ale Săptămânii
Grupul este cel mai activ în weekend, **Duminica** fiind cea mai activă zi (1283 mesaje).

**Activitate pe zilele săptămânii:**
*   Luni: 1085 mesaje
*   Marți: 1072 mesaje
*   Miercuri: 909 mesaje
*   Joi: 1164 mesaje
*   Vineri: 910 mesaje
*   Sâmbătă: 1138 mesaje
*   Duminică: 1283 mesaje

## Subiecte Favorite per Conversator

*   **Baldo**: 'asa' (28), 'daca' (28), 'aia' (25), 'bine' (25), 'marius' (22)
*   **Marius Motoi**: 'mama' (77), 'asa' (70), 'bine' (47), 'dar' (46), 'hai' (45)
*   **Vasile**: 'bine' (23), 'dar' (21), 'asa' (18), 'poker' (16), 'pai' (16)
*   **Unde**: 'dar' (96), 'https' (90), 'com' (70), 'asa' (69), 'pai' (62)
*   **R**: 'https' (21), 'dar' (16), 'vasile' (14), 'aia' (13), 'com' (12)

## Cele Mai Multe Link-uri Distribuite (Top 5)

*   **Unde**: 89 link-uri
*   **Marius Motoi**: 27 link-uri
*   **Baldo**: 22 link-uri
*   **R**: 21 link-uri
*   **Vasile**: 5 link-uri

## Subiecte Generale de Conversație

Pe baza istoricului chat-ului, conversația este foarte informală și acoperă o gamă largă de subiecte tipice unui grup de prieteni apropiați. Iată un rezumat al ceea ce discută în general:

*   **Socializare și Planuri:**
O mare parte a conversației se învârte în jurul planificării întâlnirilor, deciziei unde să iasă și coordonării activităților precum jocul de poker sau mersul la petreceri. Se pare că folosesc frecvent Discord pentru aceste aranjamente.

*   **Jocuri de Noroc, în special Poker:**
Pokerul este o temă recurentă și centrală. Discută despre jocurile lor, câștiguri și pierderi, și împărtășesc povești despre experiențele lor la sălile de poker și online.

*   **Glume, Tachinări și Meme-uri:**
    Chat-ul este plin de tachinări amicale, glume interne și partajarea de meme-uri, videoclipuri amuzante și link-uri. Tonul este foarte casual și plin de umor.

*   **Mâncare și Băutură:**
    Există discuții frecvente despre mâncare, inclusiv preferințe pentru pizza și shaorma, și discuții despre diverse băuturi alcoolice și non-alcoolice.

*   **Viața Cotidiană și Muncă:**
Împărtășesc anecdote din viața lor de zi cu zi, vorbesc despre muncă și discută proiecte personale, cum ar fi crearea unui joc video.

*   **Tehnologie și Cultură Pop:**
Grupul discută diverse subiecte legate de tehnologie, inclusiv software precum CapCut și Canva, probleme de calculator și jocuri video. De asemenea, împărtășesc și comentează muzică și alt conținut de cultură pop.

*   **Relații și Chestiuni Personale:**
Deși adesea discutate într-o manieră glumeață, există mențiuni despre relații, prietene și alte aspecte personale ale vieții lor.

Limbajul este un amestec de română și engleză, cu o utilizare intensă a argoului și a colocvialismelor, reflectând natura apropiată și informală a grupului.

## Deductii Amuzante

### Glume Interne și Teme Recurente

Mai multe glume interne și teme recurente apar pe parcursul conversației, conturând o imagine a umorului unic împărtășit al grupului:

*   **Pokerul ca Metaforă pentru Viață:**
Prietenii folosesc frecvent terminologia și analogiile din poker pentru a descrie situații cotidiene, de la relații personale la provocări profesionale. Câștigul sau pierderea la poker este un subiect comun și pare a fi o activitate centrală de legătură.
*   **"Romanian Soul Bites":**
Această expresie apare de mai multe ori, adesea într-un context umoristic sau ironic. Pare a fi o expresie cheie pentru un anumit tip de experiență sau sentiment pe care grupul îl înțelege.
*   **Arhetipuri de Caractere:**
Prietenii au creat arhetipuri și glume recurente despre personalitățile celorlalți. De exemplu, glumesc despre "R" ca fiind un guru al tehnologiei care poate repara orice și "Marius Motoi" ca fiind un povestitor expresiv și uneori dramatic.
*   **Suport Tehnic și Neplăceri:**
Există o temă recurentă a problemelor legate de tehnologie, în special cu un membru, "Robert", căruia i se interzice în glumă să folosească dispozitivele altor persoane din cauza haosului care urmează.

### Dinamica și Rolurile Grupului

*   **Planificatorul:**
**Unde** preia adesea inițiativa în organizarea întâlnirilor și activităților, în special a serilor de poker. El este frecvent cel care inițiază planuri și verifică disponibilitatea grupului.
*   **Animatorul:**
**Marius Motoi** pare a fi principalul animator al grupului, împărtășind frecvent povești amuzante, făcând glume autoironice și menținând o atmosferă veselă.
*   **Vocea Rațiunii (și Suport Tehnic):**
**R** intervine adesea cu sfaturi practice, în special în chestiuni tehnice. El este persoana de referință pentru explicarea subiectelor complexe, de la licențierea software la remedierea problemelor de calculator.

### 3. Stil de Viață și Obiceiuri

*   **Păsări de Noapte:**
Istoricul chat-ului arată o cantitate semnificativă de activitate târziu în noapte și chiar în primele ore ale dimineții, sugerând că membrii grupului stau adesea treji până târziu, mai ales când joacă poker sau socializează.
*   **Întâlniri Spontane:**
Deși planifică unele evenimente, multe dintre interacțiunile lor sociale par a fi spontane, membrii verificând frecvent cine este disponibil pentru a ieși în scurt timp.
*   **Un Amestec de Interacțiune Digitală și Față în Față:**
Grupul se mișcă fără probleme între lumile online și offline. Ei folosesc chat-ul pentru a planifica întâlniri în persoană și apoi raportează adesea grupului povești și actualizări de la acele evenimente.

## Analiză Cuprinzătoare

### Analiza Activității de Vârf

*   **Cele Mai Active Ore ale Zilei:**
Grupul este cel mai activ seara și târziu în noapte, cu un vârf semnificativ între orele **20:00 - 21:00** (704 mesaje).
*   **Cele Mai Active Zile ale Săptămânii:**
Grupul este cel mai activ în weekend, **Duminica** fiind cea mai activă zi (1283 mesaje).

**Activitate pe zilele săptămânii:**
*   Luni: 1085 mesaje
*   Marți: 1072 mesaje
*   Miercuri: 909 mesaje
*   Joi: 1164 mesaje
*   Vineri: 910 mesaje
*   Sâmbătă: 1138 mesaje
*   Duminică: 1283 mesaje

### "Dicționar" de Glume Interne și Argou

*   **"Disconcea?" / "Discsos" / "Doxxco":**
Un set jucăuș și în continuă schimbare de argou pentru "Discord."
*   **"Romanian Soul Bites":**
O expresie cheie pentru orice este stereotipic românesc.
*   **"Saga lui Robert":**
O glumă recurentă despre un prieten pe nume Robert care este comic de slab la tehnologie.
*   **"Context Francez":**
O glumă internă care nu este niciodată explicată celor din afară.
*   **"Cucamonu":**
Un termen de argou pentru "cu camionul".
*   **"Jizzy Boy Lemuriano" / "Masilur":**
Porecle afectuoase și amuzante pentru membrii grupului.
*   **"Simeticoane":**
Un cuvânt inventat folosit într-o varietate de contexte absurde, dar amuzante.

### Harta Interacțiunii Sociale

*   **Noduri Principale:** **Unde** și **Marius Motoi** sunt nodurile principale ale conversației.
*   **Perechi Cheie:** Cele mai frecvente perechi conversaționale sunt între **Unde**, **Marius Motoi** și **Baldo**.
*   **Rolul Celorlalți:** **Vasile** și **R** sunt participanți activi, **R** acționând adesea ca o sursă de informații tehnice.

### Analiza Frecvenței Subiectelor

1.  **Socializare și Tachinare:** Cea mai dominantă categorie.
2.  **Poker și Jocuri de Noroc:** Un subiect central și recurent.
3.  **Mâncare și Băutură:** Discuții frecvente despre mese și băuturi.
4.  **Muncă și Tehnologie:** Comune, dar mai puțin frecvente decât subiectele sociale.

### Amprente Lingvistice

*   **Unde:** Concis, argou inventiv și umor sec.
*   **Marius Motoi:** Expresiv, emoțional și folosește umor autoironic.
*   **Baldo:** Spiritual, observator și sarcastic.
*   **R:** Formal, tehnic și are un simț al umorului sec.
*   **Vasile:** Direct, la obiect și entuziast.
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