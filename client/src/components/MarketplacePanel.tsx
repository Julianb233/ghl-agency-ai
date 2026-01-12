import React, { useState } from 'react';
import { GlassPane } from './GlassPane';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { ShoppingCart, Star, Zap, Shield, Check, CreditCard, Package } from 'lucide-react';

export const MarketplacePanel: React.FC = () => {
    const [billingCycle, setBillingCycle] = useState<'MONTHLY' | 'ONE_TIME'>('MONTHLY');
    const [cart, setCart] = useState<string[]>([]);

    const toggleCart = (id: string) => {
        if (cart.includes(id)) {
            setCart(cart.filter(item => item !== id));
        } else {
            setCart([...cart, id]);
        }
    };

    const products = [
        {
            id: 'prod_ad_manager',
            name: 'AI Ad Manager',
            description: 'Automate Meta Ads optimization and analysis.',
            icon: <Zap className="w-6 h-6 text-pink-600" />,
            priceMonthly: 49,
            priceOneTime: 499,
            features: ['Unlimited Ad Analysis', 'Auto-Edit Ad Sets', 'Password Manager Auth']
        },
        {
            id: 'prod_seo_suite',
            name: 'SEO & Reports Suite',
            description: 'Generate white-label audits and heatmaps.',
            icon: <Star className="w-6 h-6 text-orange-600" />,
            priceMonthly: 29,
            priceOneTime: 299,
            features: ['Keyword Research', 'Technical Audits', 'User Heatmaps']
        },
        {
            id: 'prod_voice_pro',
            name: 'Voice Agent Pro',
            description: 'Advanced telephony features for high volume.',
            icon: <Shield className="w-6 h-6 text-purple-600" />,
            priceMonthly: 99,
            priceOneTime: 999,
            features: ['400% Call Volume', 'Custom Voice Cloning', 'Sentiment Analysis']
        }
    ];

    return (
        <div className="h-full flex flex-col gap-6 p-4 overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between shrink-0">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <ShoppingCart className="w-6 h-6 text-indigo-600" />
                        Marketplace & Add-ons
                    </h2>
                    <p className="text-slate-500 text-sm">Supercharge your agency with premium AI capabilities.</p>
                </div>

                <div className="flex items-center gap-4">
                    {/* Billing Toggle */}
                    <div className="bg-slate-100 p-1 rounded-lg flex text-xs font-bold">
                        <button
                            onClick={() => setBillingCycle('MONTHLY')}
                            className={`px-3 py-1.5 rounded-md transition-all ${billingCycle === 'MONTHLY' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}
                        >
                            Monthly Sub
                        </button>
                        <button
                            onClick={() => setBillingCycle('ONE_TIME')}
                            className={`px-3 py-1.5 rounded-md transition-all ${billingCycle === 'ONE_TIME' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}
                        >
                            Lifetime Deal
                        </button>
                    </div>

                    <div className="relative">
                        <Button variant="outline" size="icon" className="relative">
                            <ShoppingCart className="w-5 h-5 text-slate-600" />
                            {cart.length > 0 && (
                                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full">
                                    {cart.length}
                                </span>
                            )}
                        </Button>
                    </div>
                </div>
            </div>

            {/* Products Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {products.map(product => (
                    <GlassPane key={product.id} className="p-6 flex flex-col relative overflow-hidden group hover:border-indigo-300 transition-all duration-300">
                        {/* Background Gradient */}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-indigo-50 to-transparent rounded-bl-full opacity-50 group-hover:scale-110 transition-transform"></div>

                        <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center mb-4 z-10">
                            {product.icon}
                        </div>

                        <h3 className="text-lg font-bold text-slate-800 mb-2">{product.name}</h3>
                        <p className="text-sm text-slate-500 mb-6 flex-1">{product.description}</p>

                        <div className="space-y-3 mb-8">
                            {product.features.map((feat, i) => (
                                <div key={i} className="flex items-center gap-2 text-xs text-slate-600">
                                    <Check className="w-3 h-3 text-green-500" />
                                    {feat}
                                </div>
                            ))}
                        </div>

                        <div className="mt-auto">
                            <div className="flex items-end gap-1 mb-4">
                                <span className="text-3xl font-bold text-slate-900">
                                    ${billingCycle === 'MONTHLY' ? product.priceMonthly : product.priceOneTime}
                                </span>
                                <span className="text-xs text-slate-500 font-medium mb-1">
                                    {billingCycle === 'MONTHLY' ? '/mo' : ' one-time'}
                                </span>
                            </div>

                            <Button
                                onClick={() => toggleCart(product.id)}
                                className={`w-full ${cart.includes(product.id) ? 'bg-green-600 hover:bg-green-700' : 'bg-slate-900 hover:bg-slate-800'} text-white font-bold transition-all`}
                            >
                                {cart.includes(product.id) ? (
                                    <span className="flex items-center gap-2"><Check className="w-4 h-4" /> Added</span>
                                ) : (
                                    <span className="flex items-center gap-2"><ShoppingCart className="w-4 h-4" /> Add to Cart</span>
                                )}
                            </Button>
                        </div>
                    </GlassPane>
                ))}
            </div>

            {/* Quick Checkout / Cart Summary */}
            {cart.length > 0 && (
                <GlassPane className="mt-auto p-4 bg-indigo-50 border-indigo-100 flex items-center justify-between animate-in slide-in-from-bottom-4">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                            <CreditCard className="w-5 h-5 text-indigo-600" />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-indigo-900">{cart.length} Items in Cart</p>
                            <p className="text-xs text-indigo-600">Ready for checkout</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="text-right">
                            <p className="text-xs text-indigo-500 font-bold uppercase">Total</p>
                            <p className="text-xl font-bold text-indigo-900">
                                ${cart.reduce((acc, id) => {
                                    const prod = products.find(p => p.id === id);
                                    return acc + (prod ? (billingCycle === 'MONTHLY' ? prod.priceMonthly : prod.priceOneTime) : 0);
                                }, 0)}
                            </p>
                        </div>
                        <Button className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/30">
                            Checkout Now
                        </Button>
                    </div>
                </GlassPane>
            )}
        </div>
    );
};
