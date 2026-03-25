import type { PublicPlayer } from './player';

export type MatchStatus = 'lobby' | 'in_progress' | 'finished' | 'cancelled';
export type Team = 'A' | 'B';
export type Position = 'attacker' | 'goalkeeper';

export interface Match {
  id: string;
  code: string;
  name: string | null;
  hostId: string;
  refereeId: string | null;
  status: MatchStatus;
  scoreTarget: number;
  scoreTeamA: number;
  scoreTeamB: number;
  winnerTeam: Team | 'draw' | null;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  matchPlayers?: MatchPlayer[];
}

export interface MatchPlayer {
  id: string;
  matchId: string;
  playerId: string;
  team: Team;
  position: Position;
  goalsScored: number;
  isMvp: boolean;
  srChange: number | null;
  joinedAt: string;
  player?: PublicPlayer;
}

export interface MatchEvent {
  id: string;
  matchId: string;
  eventType: 'goal' | 'goal_cancelled';
  team: Team;
  scorerId: string | null;
  scorerPosition: Position | null;
  createdAt: string;
  scorer?: Pick<PublicPlayer, 'id' | 'username' | 'avatarUrl'>;
}
