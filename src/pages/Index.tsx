import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DemoModal } from '@/components/ui/demo-modal';
import { RegistrationModal } from '@/components/ui/registration-modal';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowRight, CheckCircle2, Brain, Zap, Shield, Users, MessageSquare, Globe } from 'lucide-react';

const Index = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading } = useAuth();
  const [isDemoOpen, setIsDemoOpen] = useState(false);
  const [isRegistrationOpen, setIsRegistrationOpen] = useState(false);
  const [modalInitialMode, setModalInitialMode] = useState<'register' | 'signin'>('register');

  // Redirect authenticated users to dashboard or their attempted URL
  useEffect(() => {
    if (!loading && user) {
      const from = (location.state as any)?.from?.pathname || '/dashboard';
      navigate(from);
    }
  }, [user, loading, navigate, location.state]);

  const openRegistrationModal = (mode: 'register' | 'signin') => {
    setModalInitialMode(mode);
    setIsRegistrationOpen(true);
  };

  const features = [
    {
      icon: <Brain className="h-6 w-6" />,
      title: "Advanced AI Technology",
      description: "Powered by state-of-the-art language models for intelligent, context-aware conversations."
    },
    {
      icon: <Shield className="h-6 w-6" />,
      title: "Enterprise Security",
      description: "Bank-grade encryption and privacy controls to protect your sensitive conversations."
    },
    {
      icon: <Zap className="h-6 w-6" />,
      title: "Real-time Processing",
      description: "Lightning-fast responses with minimal latency for seamless interaction."
    },
    {
      icon: <Users className="h-6 w-6" />,
      title: "Team Collaboration",
      description: "Streamlined workspace for teams to share insights and knowledge efficiently."
    },
    {
      icon: <MessageSquare className="h-6 w-6" />,
      title: "Contextual Understanding",
      description: "Deep comprehension of complex queries for accurate and relevant responses."
    },
    {
      icon: <Globe className="h-6 w-6" />,
      title: "Multilingual Support",
      description: "Communicate effectively across languages with native-level translation."
    }
  ];

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground dark flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground dark">
      {/* Navigation */}
      <nav className="border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <a className="flex items-center space-x-2" href="/">
            <span className="font-bold text-xl">ChatGenius</span>
          </a>
          <div className="flex items-center space-x-4">
            <Button 
              variant="ghost" 
              className="font-medium"
              onClick={() => openRegistrationModal('signin')}
            >
              Sign In
            </Button>
            <Button 
              className="font-medium"
              onClick={() => openRegistrationModal('register')}
            >
              Get Started
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="container pt-20 pb-16">
        <div className="max-w-[800px] mx-auto text-center space-y-6">
          <Badge 
            variant="secondary" 
            className="px-4 py-1 text-sm font-medium"
          >
            Trusted by 500+ enterprises worldwide
          </Badge>
          
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight">
            Transform Your Business with
            <span className="text-primary"> AI-Powered</span> Communication
          </h1>
          
          <p className="text-xl text-muted-foreground max-w-[600px] mx-auto">
            Enhance productivity and decision-making with our enterprise-grade AI communication platform.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Button 
              size="lg" 
              className="font-medium text-base px-8"
              onClick={() => openRegistrationModal('register')}
            >
              Get Started
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className="font-medium text-base"
              onClick={() => setIsDemoOpen(true)}
            >
              Watch Demo
            </Button>
          </div>

          <div className="pt-8 flex items-center justify-center gap-8 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span>No credit card required</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span>14-day free trial</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span>Cancel anytime</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container py-24 border-t border-border/40">
        <div className="text-center space-y-4 mb-16">
          <h2 className="text-3xl font-bold tracking-tight">
            Enterprise-Grade Features
          </h2>
          <p className="text-lg text-muted-foreground max-w-[600px] mx-auto">
            Comprehensive solutions designed to meet the demanding needs of modern businesses
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <Card 
              key={index} 
              className="bg-card/50 backdrop-blur border-border/50 transition-all duration-300 hover:shadow-lg hover:border-primary/50"
            >
              <CardContent className="p-6">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-4">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold mb-2">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground">
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Stats Section */}
      <section className="border-y border-border/40 bg-muted/20">
        <div className="container py-16">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-3xl font-bold text-primary">99.9%</div>
              <div className="text-muted-foreground">Uptime SLA</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-primary">500+</div>
              <div className="text-muted-foreground">Enterprise Clients</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-primary">50M+</div>
              <div className="text-muted-foreground">API Calls Daily</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-primary">24/7</div>
              <div className="text-muted-foreground">Expert Support</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container py-24 text-center">
        <div className="max-w-[600px] mx-auto space-y-8">
          <h2 className="text-3xl font-bold tracking-tight">
            Ready to Transform Your Business?
          </h2>
          <p className="text-lg text-muted-foreground">
            Join industry leaders who are already leveraging our AI technology to drive innovation and growth.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              className="font-medium text-base px-8"
              onClick={() => openRegistrationModal('register')}
            >
              Start Free Trial
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className="font-medium text-base"
              onClick={() => setIsDemoOpen(true)}
            >
              Schedule Demo
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/40 bg-muted/20">
        <div className="container py-8">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="flex items-center space-x-2">
              <span className="font-bold">ChatGenius</span>
              <span className="text-muted-foreground">© 2024 All rights reserved.</span>
            </div>
            <div className="flex space-x-6 text-muted-foreground">
              <a href="#" className="hover:text-foreground transition-colors">Privacy</a>
              <a href="#" className="hover:text-foreground transition-colors">Terms</a>
              <a href="#" className="hover:text-foreground transition-colors">Security</a>
              <a href="#" className="hover:text-foreground transition-colors">Contact</a>
            </div>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <DemoModal 
        open={isDemoOpen} 
        onClose={() => setIsDemoOpen(false)} 
      />

      <RegistrationModal 
        open={isRegistrationOpen} 
        onClose={() => setIsRegistrationOpen(false)} 
        initialMode={modalInitialMode}
      />
    </div>
  );
};

export default Index;
