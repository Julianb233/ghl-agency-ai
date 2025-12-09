
import React from 'react';
import { User, TeamActivity } from '../types';
import { GlassPane } from './GlassPane';

interface TeamPanelProps {
  users: User[];
  activities: TeamActivity[];
  currentUser: User;
  onSwitchUser?: (userId: string) => void;
  onInvite?: () => void;
}

export const TeamPanel: React.FC<TeamPanelProps> = ({ users, activities, currentUser, onSwitchUser, onInvite }) => {
  return (
    <div className="flex flex-col h-full gap-4">
      {/* Team Members List */}
      <GlassPane
        title="Active Personnel"
        className="shrink-0"
        headerAction={onInvite && (
          <button
            onClick={onInvite}
            className="text-[10px] bg-indigo-50 text-indigo-600 px-2 py-1 rounded hover:bg-indigo-100 transition font-bold uppercase tracking-wider"
          >
            + Invite
          </button>
        )}
      >
        <div className="p-1 max-h-48 overflow-y-auto">
          {users.map(user => (
            <button
              key={user.id}
              onClick={() => onSwitchUser?.(user.id)}
              className={`w-full flex items-center gap-3 p-2 rounded-lg transition-all text-left ${currentUser.id === user.id
                ? 'bg-indigo-50 border border-indigo-100 shadow-sm'
                : 'hover:bg-slate-50 border border-transparent'
                }`}
            >
              <div className="relative">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-sm
                  ${user.role === 'OWNER' ? 'bg-gradient-to-br from-amber-400 to-orange-400' :
                    user.role === 'MANAGER' ? 'bg-gradient-to-br from-blue-400 to-indigo-400' :
                      'bg-gradient-to-br from-slate-400 to-slate-500'}`}
                >
                  {user.avatarInitials}
                </div>
                {user.isOnline && (
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full"></span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className={`text-sm font-bold ${currentUser.id === user.id ? 'text-indigo-900' : 'text-slate-700'}`}>
                    {user.name} {currentUser.id === user.id && <span className="text-[10px] text-indigo-500 font-normal">(You)</span>}
                  </p>
                  <span className={`text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded
                     ${user.role === 'OWNER' ? 'bg-amber-50 text-amber-600' :
                      user.role === 'MANAGER' ? 'bg-blue-50 text-blue-600' :
                        'bg-slate-100 text-slate-500'}`}
                  >
                    {user.role}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 truncate">
                  {user.role === 'VA' ? 'Execution Only' : 'Full Access'}
                </p>
              </div>
            </button>
          ))}
        </div>
      </GlassPane>

      {/* Activity Feed */}
      <GlassPane title="Team Activity Log" className="flex-1 min-h-0">
        <div className="p-3 space-y-4 h-full overflow-y-auto">
          {activities.length === 0 && <p className="text-xs text-slate-400 text-center italic mt-4">No recent team activity</p>}

          {activities.map((activity) => (
            <div key={activity.id} className="relative pl-4 border-l border-slate-200 pb-2 last:pb-0">
              <div className={`absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full border-2 border-white shadow-sm
                ${activity.type === 'modification' ? 'bg-amber-400' :
                  activity.type === 'execution' ? 'bg-indigo-400' : 'bg-slate-300'}`}
              />
              <div className="flex flex-col">
                <span className="text-[10px] text-slate-400 font-mono">{activity.timestamp}</span>
                <p className="text-xs text-slate-700">
                  <span className="font-bold">{activity.userName}</span> {activity.action}
                </p>
                <p className="text-[10px] text-slate-500 bg-slate-50 px-2 py-1 rounded mt-1 inline-block w-fit border border-slate-100">
                  {activity.target}
                </p>
              </div>
            </div>
          ))}
        </div>
      </GlassPane>
    </div>
  );
};
