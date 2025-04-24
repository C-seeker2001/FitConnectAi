import React from 'react';

type UserStatsProps = {
  workoutCount: number;
  followingCount: number;
  followerCount: number;
  className?: string;
}

export default function UserStatsDisplay({ 
  workoutCount, 
  followingCount, 
  followerCount, 
  className = '' 
}: UserStatsProps) {
  return (
    <div className={`grid grid-cols-3 gap-4 ${className}`}>
      <div className="text-center">
        <div className="font-mono font-semibold">{workoutCount}</div>
        <div className="text-xs text-secondary whitespace-nowrap">Workouts</div>
      </div>
      <div className="text-center">
        <div className="font-mono font-semibold">{followingCount}</div>
        <div className="text-xs text-secondary whitespace-nowrap">Following</div>
      </div>
      <div className="text-center">
        <div className="font-mono font-semibold">{followerCount}</div>
        <div className="text-xs text-secondary whitespace-nowrap">Followers</div>
      </div>
    </div>
  );
}