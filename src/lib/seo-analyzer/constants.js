// ---------------------------------------------------------------------------
// Stopwords for keyword extraction
// ---------------------------------------------------------------------------
export const STOPWORDS = new Set([
  "a","about","above","after","again","against","all","am","an","and","any",
  "are","aren't","as","at","be","because","been","before","being","below",
  "between","both","but","by","can","can't","cannot","could","couldn't","did",
  "didn't","do","does","doesn't","doing","don't","down","during","each","few",
  "for","from","further","get","got","had","hadn't","has","hasn't","have",
  "haven't","having","he","he'd","he'll","he's","her","here","here's","hers",
  "herself","him","himself","his","how","how's","i","i'd","i'll","i'm","i've",
  "if","in","into","is","isn't","it","it's","its","itself","just","let's","me",
  "might","more","most","mustn't","my","myself","no","nor","not","of","off",
  "on","once","only","or","other","ought","our","ours","ourselves","out","over",
  "own","per","same","shan't","she","she'd","she'll","she's","should",
  "shouldn't","so","some","such","than","that","that's","the","their","theirs",
  "them","themselves","then","there","there's","these","they","they'd",
  "they'll","they're","they've","this","those","through","to","too","under",
  "until","up","us","very","was","wasn't","we","we'd","we'll","we're","we've",
  "were","weren't","what","what's","when","when's","where","where's","which",
  "while","who","who's","whom","why","why's","will","with","won't","would",
  "wouldn't","you","you'd","you'll","you're","you've","your","yours",
  "yourself","yourselves","also","like","just","one","two","new","use","used",
  "using","will","may","well","back","even","still","way","take","come","make",
  "know","say","said","get","go","see","look","think","thing","things","much",
  "many","good","great","first","last","long","big","little","right","old",
  "high","different","small","large","next","early","young","important",
  "public","already","made","find","work","part","people","day","year","time",
  "site","page","click","home","help","contact","read","need","want","try",
]);

// Known CDN domains
export const CDN_DOMAINS = [
  "cdn.jsdelivr.net","cdnjs.cloudflare.com","unpkg.com","ajax.googleapis.com",
  "fonts.googleapis.com","fonts.gstatic.com","maxcdn.bootstrapcdn.com",
  "stackpath.bootstrapcdn.com","cdn.bootcdn.net","cdn.staticfile.org",
  "code.jquery.com","cdn.cloudflare.com","fastly.net","akamaized.net",
  "cloudfront.net","azureedge.net","b-cdn.net","cdn77.org",
];

// Deprecated HTML tags
export const DEPRECATED_TAGS = [
  "font","center","marquee","blink","frame","frameset","noframes","strike",
  "big","tt",
];
