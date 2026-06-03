import React, { useState } from 'react';
import { auth } from '../lib/auth';
import { storage } from '../lib/storage';
import { Lock, Mail, AlertCircle, ArrowRight, RefreshCw } from 'lucide-react';

interface LoginProps {
    onLoginSuccess: () => void;
}

export function Login({ onLoginSuccess }: LoginProps) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const success = await auth.login(email, password);
            if (success) {
                onLoginSuccess();
            } else {
                setError('信箱或密碼錯誤');
            }
        } catch (err) {
            setError('系統發生錯誤，請稍後再試');
        } finally {
            setIsLoading(false);
        }
    };

    const handleClearCache = async () => {
        if (window.confirm('確定要清除所有本地快取（IndexedDB & localStorage）嗎？\n這將會清除當前登入狀態並重新整理頁面。')) {
            await storage.clearAllCache();
            window.location.reload();
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
                <div className="text-center mb-8">
                    <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Lock className="text-blue-600" size={32} />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">旅遊手冊主控台</h1>
                    <p className="text-gray-500">請登入以繼續</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-6">
                    {error && (
                        <div className="bg-red-50 text-red-600 p-4 rounded-xl flex items-center gap-3 text-sm">
                            <AlertCircle size={18} />
                            {error}
                        </div>
                    )}

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                員工編號 / 電子信箱
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Mail className="text-gray-400" size={18} />
                                </div>
                                <input
                                    type="text"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                    placeholder="員工編號"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                密碼
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Lock className="text-gray-400" size={18} />
                                </div>
                                <input
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                    placeholder="請輸入密碼"
                                />
                            </div>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-blue-600 text-white font-medium py-3 px-4 rounded-xl hover:bg-blue-700 focus:ring-4 focus:ring-blue-200 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {isLoading ? '登入中...' : '登入系統'}
                        {!isLoading && <ArrowRight size={18} />}
                    </button>
                </form>

                <div className="mt-8 pt-6 border-t border-gray-100 flex justify-center">
                    <button
                        onClick={handleClearCache}
                        className="flex items-center gap-2 text-xs text-gray-400 hover:text-red-500 transition-colors"
                        title="清除本地暫存資料"
                    >
                        <RefreshCw size={12} />
                        清除快取並重新載入
                    </button>
                </div>
            </div>
        </div>
    );
}
