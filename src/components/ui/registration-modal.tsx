import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { X, Mail, Lock, User, Eye, EyeOff, Sparkles, Zap, UserCheck } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

interface RegistrationModalProps {
  open: boolean;
  onClose: () => void;
  initialMode?: 'register' | 'signin';
}

export const RegistrationModal: React.FC<RegistrationModalProps> = ({ 
  open, 
  onClose, 
  initialMode = 'register' 
}) => {
  const { signUp, signIn, resetPassword, resendConfirmationEmail } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<'register' | 'signin'>(initialMode);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showResendButton, setShowResendButton] = useState(false);

  // Update mode when initialMode prop changes
  React.useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
    if (successMessage) {
      setSuccessMessage('');
    }
    if (showResendButton) {
      setShowResendButton(false);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (mode === 'register' && !formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (mode === 'register' && formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsLoading(true);
    setErrors({});
    setSuccessMessage('');

    try {
      if (mode === 'register') {
        const { error } = await signUp(formData.email, formData.password, { 
          name: formData.name 
        });
        
        if (error) {
          if (error.message.includes('User already registered')) {
            setErrors({ email: 'An account with this email already exists' });
          } else {
            setErrors({ general: error.message });
          }
        } else {
          setSuccessMessage('If everything will be fine, you will receive a confirmation link!');
          setTimeout(() => {
            handleClose();
          }, 2000);
        }
      } else {
        const { error } = await signIn(formData.email, formData.password);
        
        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            setErrors({ general: 'Invalid email or password' });
            setShowResendButton(false);
          } else if (error.message.includes('Email not confirmed')) {
            setErrors({ general: 'Please check your email and confirm your account' });
            setShowResendButton(true);
          } else {
            setErrors({ general: error.message });
            setShowResendButton(false);
          }
        } else {
          // Successful sign in
          handleClose();
          navigate('/dashboard');
        }
      }
    } catch (error) {
      setErrors({ general: 'Something went wrong. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!formData.email) {
      setErrors({ email: 'Please enter your email address first' });
      return;
    }

    setIsLoading(true);
    const { error } = await resetPassword(formData.email);
    
    if (error) {
      setErrors({ general: error.message });
    } else {
      setSuccessMessage('Password reset email sent! Check your inbox.');
    }
    setIsLoading(false);
  };

  const handleResendConfirmation = async () => {
    if (!formData.email) {
      setErrors({ email: 'Please enter your email address first' });
      return;
    }

    setIsLoading(true);
    setErrors({});
    setSuccessMessage('');

    const { error } = await resendConfirmationEmail(formData.email);
    
    if (error) {
      setErrors({ general: error.message });
    } else {
      setSuccessMessage('Confirmation email sent! Check your inbox.');
      setShowResendButton(false);
    }
    setIsLoading(false);
  };

  const switchMode = () => {
    setMode(mode === 'register' ? 'signin' : 'register');
    setFormData({ name: '', email: '', password: '' });
    setErrors({});
    setSuccessMessage('');
    setShowPassword(false);
    setShowResendButton(false);
  };

  const handleClose = () => {
    // Reset all states when closing
    setMode('register');
    setFormData({ name: '', email: '', password: '' });
    setErrors({});
    setSuccessMessage('');
    setShowPassword(false);
    setShowResendButton(false);
    setIsLoading(false);
    onClose();
  };

  if (!open) return null;

  const isRegisterMode = mode === 'register';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
        onClick={handleClose}
      />
      
      {/* Modal */}
      <Card className="relative w-full max-w-md transform animate-in zoom-in-95 duration-300 border-primary/20 shadow-2xl shadow-primary/10">
        <CardHeader className="relative">
          
          {/* Close button */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-2 top-2 z-10 hover:bg-destructive/10 hover:text-destructive transition-colors duration-200"
            onClick={handleClose}
            type="button"
          >
            <X className="h-4 w-4" />
          </Button>

          {/* Header content */}
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <CardTitle className="text-2xl font-bold text-foreground">
                {isRegisterMode ? 'Join ChatGenius' : 'Nice to see you'}
              </CardTitle>
            </div>
            <CardDescription className="text-muted-foreground">
              {isRegisterMode 
                ? 'Create your account and unlock the future of AI conversations'
                : 'Sign in to continue your AI journey'
              }
            </CardDescription>
            
            {/* Benefits badges - only show for registration */}
            {isRegisterMode && (
              <div className="flex flex-wrap gap-2 pt-2">
                <Badge variant="secondary" className="text-xs hover:scale-105 transition-transform duration-200">
                  <Zap className="h-3 w-3 mr-1" />
                  Instant Access
                </Badge>
                <Badge variant="secondary" className="text-xs hover:scale-105 transition-transform duration-200">
                  🎯 100% Free
                </Badge>
                <Badge variant="secondary" className="text-xs hover:scale-105 transition-transform duration-200">
                  ⚡ No Limits
                </Badge>
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Success Message */}
          {successMessage && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-md">
              <p className="text-sm text-green-600">{successMessage}</p>
            </div>
          )}

          {/* General Error Message */}
          {errors.general && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{errors.general}</p>
              {/* Resend Confirmation Button */}
              {showResendButton && !isRegisterMode && (
                <div className="mt-3">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-sm hover:bg-primary/10 hover:border-primary transition-colors duration-200"
                    type="button"
                    onClick={handleResendConfirmation}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                        <span>Sending...</span>
                      </div>
                    ) : (
                      <>
                        <Mail className="h-3 w-3 mr-2" />
                        Resend Confirmation Mail
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name Field - only for registration */}
            {isRegisterMode && (
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium">
                  Full Name
                </Label>
                <div className="relative group">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors duration-200" />
                  <Input
                    id="name"
                    type="text"
                    placeholder="Enter your full name"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className={`pl-10 transition-all duration-200 hover:border-primary/50 focus:border-primary ${
                      errors.name ? 'border-destructive focus:border-destructive' : ''
                    }`}
                  />
                </div>
                {errors.name && (
                  <p className="text-xs text-destructive animate-in slide-in-from-left-1 duration-200">
                    {errors.name}
                  </p>
                )}
              </div>
            )}

            {/* Email Field */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">
                Email Address
              </Label>
              <div className="relative group">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors duration-200" />
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className={`pl-10 transition-all duration-200 hover:border-primary/50 focus:border-primary ${
                    errors.email ? 'border-destructive focus:border-destructive' : ''
                  }`}
                />
              </div>
              {errors.email && (
                <p className="text-xs text-destructive animate-in slide-in-from-left-1 duration-200">
                  {errors.email}
                </p>
              )}
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">
                Password
              </Label>
              <div className="relative group">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors duration-200" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder={isRegisterMode ? "Create a strong password" : "Enter your password"}
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  className={`pl-10 pr-10 transition-all duration-200 hover:border-primary/50 focus:border-primary ${
                    errors.password ? 'border-destructive focus:border-destructive' : ''
                  }`}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors duration-200" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors duration-200" />
                  )}
                </Button>
              </div>
              {errors.password && (
                <p className="text-xs text-destructive animate-in slide-in-from-left-1 duration-200">
                  {errors.password}
                </p>
              )}
            </div>

            {/* Forgot Password Link - only for sign in */}
            {!isRegisterMode && (
              <div className="text-right">
                <Button
                  variant="link"
                  className="h-auto p-0 text-xs text-primary hover:underline"
                  type="button"
                  onClick={handleForgotPassword}
                  disabled={isLoading}
                >
                  Forgot your password?
                </Button>
              </div>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full h-11 text-base font-semibold hover:scale-105 hover:shadow-lg hover:shadow-primary/25 transition-all duration-300 relative overflow-hidden group"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>{isRegisterMode ? 'Creating Account...' : 'Signing In...'}</span>
                </div>
              ) : (
                <>
                  <span className="relative z-10">
                    {isRegisterMode ? 'Start Your AI Journey ✨' : 'Sign In to ChatGenius 🚀'}
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                </>
              )}
            </Button>
          </form>

          {/* Footer */}
          <div className="text-center space-y-2 pt-4 border-t border-border/50">
            <p className="text-xs text-muted-foreground">
              By {isRegisterMode ? 'joining' : 'signing in'}, you agree to our{' '}
              <a href="#" className="text-primary hover:underline transition-colors duration-200">
                Terms
              </a>{' '}
              and{' '}
              <a href="#" className="text-primary hover:underline transition-colors duration-200">
                Privacy Policy
              </a>
            </p>
            <p className="text-xs text-muted-foreground">
              {isRegisterMode ? 'Already have an account?' : "Don't have an account?"}{' '}
              <Button
                variant="link"
                className="h-auto p-0 text-xs text-primary hover:underline"
                onClick={switchMode}
                type="button"
              >
                {isRegisterMode ? 'Sign in instead' : 'Create one now'}
              </Button>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}; 