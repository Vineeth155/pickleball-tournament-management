import mongoose, { Schema, models } from "mongoose";

const TeamSchema = new Schema({
  id: String,
  name: String,
  seed: Number,
  players: [String],
  skillLevel: String,
  ageGroup: String,
  gender: { type: String, enum: ["Men", "Women", "Mixed"] },
  poolId: Schema.Types.Mixed,
  contactEmail: String,
  contactPhone: String,
  qualified: Boolean,
  manualPosition: Number,
});

const MatchSchema = new Schema({
  id: String,
  round: Number,
  position: Number,
  team1Id: String,
  team2Id: String,
  team1Score: Number,
  team2Score: Number,
  team1Games: [Number],
  team2Games: [Number],
  team1TotalPoints: Number,
  team2TotalPoints: Number,
  winnerId: String,
  isBye: Boolean,
  isWinnersBracket: Boolean,
  loserGoesTo: String,
  winnerGoesTo: String,
  court: String,
  scheduledTime: String,
  matchType: { type: String, enum: ["Singles", "Doubles", "Mixed Doubles"] },
  bestOf: Number,
  completed: Boolean,
  poolId: Schema.Types.Mixed,
  isKnockout: Boolean,
});

const PoolSchema = new Schema({
  id: String,
  name: String,
  teams: [TeamSchema],
});

const CategorySchema = new Schema({
  id: { type: String },
  matchType: {
    type: String,
    enum: [
      "Men's Singles",
      "Men's Doubles",
      "Women's Singles",
      "Women's Doubles",
      "Mixed Doubles",
    ],
  },
  skillLevel: {
    min: { type: Number },
    max: { type: Number },
  },
  ageGroup: { type: String },
  seedingMethod: {
    type: String,
    enum: ["Random", "Ranking_Based"],
  }
});

const TournamentSchema = new Schema({
  id: String,
  name: String,
  description: String,
  format: {
    type: String,
    enum: [
      "single_elimination",
      "double_elimination",
      "round_robin",
      "pool_play",
    ],
  },
  createdAt: Number,
  categories: { 
    type: [CategorySchema],
    validate: {
      validator: (v: any) => {
        console.log(v.length);
        return v.length > 0;
      },
      message: "At least one category is required"
    }
  },
  matches: [MatchSchema],
  totalRounds: Number,
  totalWinnerRounds: Number,
  teams: [TeamSchema],
  createdBy: String,
  location: String,
  startDate: String,
  endDate: String,
  division: String,
  pointsToWin: Number,
  winBy: Number,
  bestOf: Number,
  matchType: { type: String, enum: ["Singles", "Doubles", "Mixed Doubles"] },
  pools: [PoolSchema],
  slug: String,
  isStarted: Boolean,
  earlyRoundGames: Number,
  quarterFinalGames: Number,
  semiFinalGames: Number,
  finalGames: Number,
  knockoutBracketPopulated: Boolean,
});

export default models.Tournament ||
  mongoose.model("Tournament", TournamentSchema);
