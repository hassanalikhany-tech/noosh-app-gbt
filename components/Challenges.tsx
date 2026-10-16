
import React from 'react';
import { Trophy, CheckCircle2, Circle } from 'lucide-react';
import { UserProfile } from '../types';
import { UserService } from '../services/userService';
import { CHALLENGES } from '../data/challenges';

interface ChallengesProps {
  user: UserProfile;
  onUpdateUser: (user: UserProfile) => void;
  onNotify: (title: string, message: string, color: string, icon: any) => void;
}

const Challenges: React.FC<ChallengesProps> = ({ user, onUpdateUser, onNotify }) => {
  const [localActiveId, setLocalActiveId] = React.useState<string | null>(user.activeChallengeId || null);

  React.useEffect(() => {
    setLocalActiveId(user.activeChallengeId || null);
  }, [user.activeChallengeId]);
  
  const toggleChallenge = async (id: string) => {
    const selectedChallenge = CHALLENGES.find(c => c.id === id);
    if (!selectedChallenge) return;

    const isCurrentlyActive = localActiveId === id;
    const nextActiveId = isCurrentlyActive ? null : id;
    
    // Optimistic update
    setLocalActiveId(nextActiveId);

    try {
      if (isCurrentlyActive) {
        const updatedUser = await UserService.updateProfile(user.username, { activeChallengeId: null });
        onUpdateUser(updatedUser);
        onNotify(
          'چالش غیرفعال شد',
          'برنامه غذایی شما به حالت عادی بازگشت.',
          'bg-slate-600',
          Trophy
        );
      } else {
        const updatedUser = await UserService.updateProfile(user.username, { activeChallengeId: id });
        onUpdateUser(updatedUser);
        onNotify(
          `چالش ${selectedChallenge.title} فعال شد`,
          selectedChallenge.description,
          selectedChallenge.color.replace('bg-', 'bg-').split('-')[1] === 'blue' ? 'bg-blue-600' : 
          selectedChallenge.color.replace('bg-', 'bg-').split('-')[1] === 'green' ? 'bg-green-600' :
          selectedChallenge.color.replace('bg-', 'bg-').split('-')[1] === 'emerald' ? 'bg-emerald-600' :
          selectedChallenge.color.replace('bg-', 'bg-').split('-')[1] === 'red' ? 'bg-red-600' : 
          selectedChallenge.color.replace('bg-', 'bg-').split('-')[1] === 'rose' ? 'bg-rose-600' : 'bg-purple-600',
          selectedChallenge.icon
        );
      }
    } catch (error) {
      // Rollback on error
      setLocalActiveId(user.activeChallengeId || null);
      onNotify('خطا', 'مشکلی در بروزرسانی چالش پیش آمد.', 'bg-rose-600', Trophy);
    }
  };

  return (
    <div className="flex flex-col h-full [@media(orientation:landscape)_and_(max-height:500px)]:h-auto animate-enter">
      {/* هدر شیشه‌ای دقیق با فونت استاندارد */}
      <div className="sticky top-0 [@media(orientation:landscape)_and_(max-height:500px)]:relative z-[900] bg-white/40 backdrop-blur-2xl px-4 py-2 sm:py-4 sm:px-10">
          <div className="backdrop-blur-3xl bg-white/50 border border-white/60 rounded-[1.5rem] sm:rounded-[2rem] p-3 sm:p-6 shadow-xl shadow-slate-200/50 relative overflow-hidden max-w-7xl mx-auto">
            <div className="relative z-10 flex flex-col sm:flex-row items-center gap-3 sm:gap-6">
              <div className="p-2 sm:p-4 bg-yellow-400 rounded-lg sm:rounded-[1.5rem] shadow-xl">
                 <Trophy size={24} className="text-white sm:w-10 sm:h-10" />
              </div>
              <div className="text-center sm:text-right">
                  <h2 className="text-lg sm:text-2xl font-black mb-0.5 leading-tight text-slate-800">چالش‌های هفتگی غذا</h2>
                  <p className="text-slate-500 max-w-2xl text-[9px] sm:text-sm font-black leading-relaxed">
                    با شرکت در چالش‌های هفتگی نوش، عادت‌های غذایی سالم‌تری بسازید و تنوع غذاهای سفره را افزایش دهید.
                  </p>
              </div>
            </div>
          </div>
      </div>

      <div className="flex-grow overflow-y-auto [@media(orientation:landscape)_and_(max-height:500px)]:overflow-visible px-4 sm:px-10 pb-24 no-scrollbar">
          <div className="max-w-7xl mx-auto py-2 sm:py-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
                {CHALLENGES.map((challenge) => {
                  const isActive = localActiveId === challenge.id;
                  const Icon = challenge.icon;
                  
                  return (
                    <div 
                      key={challenge.id}
                      role="button"
                      className={`
                        group relative bg-white rounded-[1.5rem] sm:rounded-[2rem] p-4 sm:p-6 border-2 transition-all duration-500 cursor-pointer overflow-hidden
                        ${isActive 
                          ? 'border-violet-500 shadow-2xl shadow-violet-100 transform -translate-y-1 ring-4 ring-violet-50' 
                          : 'border-slate-50 hover:border-violet-200 hover:shadow-xl hover:-translate-y-1'
                        }
                      `}
                      onClick={() => toggleChallenge(challenge.id)}
                    >
                      <div className={`w-10 h-10 sm:w-14 sm:h-14 ${challenge.color} rounded-xl sm:rounded-2xl flex items-center justify-center text-white mb-2 sm:mb-4 shadow-lg group-hover:scale-110 transition-transform duration-500`}>
                        <Icon size={20} className="sm:w-8 sm:h-8" strokeWidth={2.5} />
                      </div>
                      <h3 className="text-base sm:text-lg font-black text-slate-800 mb-1 sm:mb-2">{challenge.title}</h3>
                      <p className="text-slate-500 text-[10px] sm:text-xs leading-relaxed mb-8 h-8 sm:h-10 font-bold overflow-hidden">
                        {challenge.description}
                      </p>
                      <div className={`
                        absolute bottom-0 left-0 w-full p-2.5 sm:p-4 transition-colors duration-500
                        ${isActive ? 'bg-violet-600 text-white' : 'bg-slate-50 group-hover:bg-slate-100 text-slate-600'}
                      `}>
                        <div className="flex items-center justify-center gap-1.5 sm:gap-2 font-black text-[9px] sm:text-xs">
                          {isActive ? (
                            <>
                              <CheckCircle2 size={14} className="animate-pulse" />
                              لغو چالش فعال
                            </>
                          ) : (
                            <>
                              <Circle size={14} />
                              پذیرش چالش
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
          </div>
      </div>
    </div>
  );
};

export default Challenges;
