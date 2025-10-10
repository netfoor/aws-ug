'use client';

import { useAuth } from '@/context/auth-context';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { TalaveraPattern } from '@/components/ui/TalaveraPattern';

export default function Home() {
  const { user, isAuthenticated, isLoading, isAdmin } = useAuth();

  return (
    <div className="min-h-screen theme-transition">
      {/* Hero Section */}
      <section className="relative py-20 px-4 overflow-hidden bg-gradient-to-br from-background via-secondary/30 to-background">
        <TalaveraPattern variant="background" />
        <div className="absolute top-10 right-10 opacity-20">
          <TalaveraPattern variant="corner" size="lg" animate />
        </div>
        <div className="absolute bottom-10 left-10 opacity-20">
          <TalaveraPattern variant="corner" size="lg" animate />
        </div>
        
        <div className="container mx-auto text-center relative z-10">
          <div className="flex justify-center mb-8 animate-fade-in">
            <div className="relative">
              <TalaveraPattern variant="corner" size="lg" animate />
              <div className="absolute inset-0 bg-accent/10 blur-3xl rounded-full"></div>
            </div>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold mb-6 animate-slide-up">
            <span className="block text-text-primary">AWS User Group</span>
            <span className="block text-accent mt-2 drop-shadow-lg">Puebla</span>
          </h1>
          
          <p className="text-lg md:text-xl text-text-secondary max-w-3xl mx-auto mb-8 animate-fade-in leading-relaxed">
            Únete a la comunidad oficial de desarrolladores y profesionales de AWS en Puebla. 
            <span className="block mt-2 font-medium text-accent">Aprende, comparte y crece junto a nosotros.</span>
          </p>
          
          {isLoading ? (
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-accent border-t-transparent"></div>
            </div>
          ) : !isAuthenticated ? (
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-slide-up">
              <Button variant="accent" size="lg" asChild className="shadow-talavera-lg hover:scale-105 transition-transform">
                <Link href="/login">Únete a la Comunidad</Link>
              </Button>
              <Button variant="outline" size="lg" asChild className="hover:scale-105 transition-transform">
                <Link href="#eventos">Ver Eventos</Link>
              </Button>
            </div>
          ) : (
            <Button variant="primary" size="lg" asChild className="shadow-talavera-lg hover:scale-105 transition-transform animate-slide-up">
              <Link href="/dashboard">Ir al Dashboard</Link>
            </Button>
          )}
        </div>
      </section>

      {/* User Status Card */}
      {isAuthenticated && user && (
        <section className="py-8 px-4 animate-fade-in">
          <div className="container mx-auto">
            <Card variant="talavera" className="hover:shadow-talavera-lg transition-all duration-300">
              <CardContent className="flex flex-col md:flex-row items-center justify-between p-6 gap-4">
                <div className="flex items-center space-x-4">
                  <div className="h-16 w-16 bg-gradient-to-br from-accent to-accent/70 rounded-full flex items-center justify-center shadow-talavera">
                    <span className="text-white font-bold text-2xl">
                      {user.signInDetails?.loginId?.charAt(0).toUpperCase() || 'U'}
                    </span>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-text-primary">
                      ¡Bienvenido, {user.signInDetails?.loginId?.split('@')[0] || 'Usuario'}!
                    </h2>
                    <p className="text-sm text-text-secondary flex items-center gap-2">
                      {isAdmin && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-accent/10 text-accent border border-accent/20">
                          Administrador
                        </span>
                      )}
                      {!isAdmin && 'Miembro de la comunidad'}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-3 justify-center">
                  <Button variant="primary" asChild className="hover:scale-105 transition-transform">
                    <Link href="/dashboard">Dashboard</Link>
                  </Button>
                  <Button variant="outline" asChild className="hover:scale-105 transition-transform">
                    <Link href="/profile">Perfil</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      )}

      {/* Features Section */}
      <section className="py-20 px-4 relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl"></div>
        
        <div className="container mx-auto relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-text-primary">
              ¿Por qué unirte?
            </h2>
            <div className="w-24 h-1 bg-gradient-to-r from-accent to-primary mx-auto rounded-full"></div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="hover:shadow-talavera-lg transition-all duration-300 hover:-translate-y-2 group">
              <CardHeader className="text-center">
                <div className="mx-auto h-16 w-16 bg-gradient-to-br from-accent to-accent/70 rounded-2xl flex items-center justify-center mb-4 shadow-talavera group-hover:scale-110 transition-transform">
                  <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <CardTitle className="text-2xl">Comunidad</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-center text-base">
                  Conecta con desarrolladores y arquitectos de soluciones AWS en Puebla. Networking real y colaboración continua.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="hover:shadow-talavera-lg transition-all duration-300 hover:-translate-y-2 group">
              <CardHeader className="text-center">
                <div className="mx-auto h-16 w-16 bg-gradient-to-br from-primary to-primary/70 rounded-2xl flex items-center justify-center mb-4 shadow-talavera group-hover:scale-110 transition-transform">
                  <svg className="h-8 w-8 text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <CardTitle className="text-2xl">Aprendizaje</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-center text-base">
                  Accede a workshops, charlas técnicas y recursos educativos sobre AWS. Aprende de expertos certificados.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="hover:shadow-talavera-lg transition-all duration-300 hover:-translate-y-2 group">
              <CardHeader className="text-center">
                <div className="mx-auto h-16 w-16 bg-gradient-to-br from-accent to-primary rounded-2xl flex items-center justify-center mb-4 shadow-talavera group-hover:scale-110 transition-transform">
                  <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <CardTitle className="text-2xl">Eventos</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-center text-base">
                  Participa en meetups, hackathons y conferencias sobre tecnología AWS. Eventos mensuales presenciales.
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 px-4 bg-gradient-to-r from-primary to-primary/90 text-secondary relative overflow-hidden">
        <TalaveraPattern variant="background" />
        <div className="container mx-auto relative z-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div className="animate-fade-in">
              <div className="text-5xl font-bold text-accent mb-2">500+</div>
              <div className="text-sm opacity-90">Miembros</div>
            </div>
            <div className="animate-fade-in" style={{ animationDelay: '0.1s' }}>
              <div className="text-5xl font-bold text-accent mb-2">50+</div>
              <div className="text-sm opacity-90">Eventos</div>
            </div>
            <div className="animate-fade-in" style={{ animationDelay: '0.2s' }}>
              <div className="text-5xl font-bold text-accent mb-2">30+</div>
              <div className="text-sm opacity-90">Speakers</div>
            </div>
            <div className="animate-fade-in" style={{ animationDelay: '0.3s' }}>
              <div className="text-5xl font-bold text-accent mb-2">100%</div>
              <div className="text-sm opacity-90">Gratis</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-accent/5 via-transparent to-primary/5"></div>
        <TalaveraPattern variant="floating" className="top-10 right-10" animate />
        <TalaveraPattern variant="floating" className="bottom-10 left-10" animate />
        
        <div className="container mx-auto text-center relative z-10">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-4xl md:text-5xl font-bold mb-6 text-text-primary">
              ¿Listo para formar parte de la comunidad?
            </h2>
            <p className="text-lg md:text-xl text-text-secondary mb-8 leading-relaxed">
              Únete a nosotros y acelera tu carrera en la nube de AWS. 
              <span className="block mt-2 font-medium">Eventos gratuitos, networking y aprendizaje continuo.</span>
            </p>
            <Button 
              variant="accent" 
              size="lg" 
              asChild 
              className="shadow-talavera-lg hover:scale-105 transition-transform text-lg px-12 py-6"
            >
              <Link href={isAuthenticated ? "/dashboard" : "/login"}>
                {isAuthenticated ? "Ir al Dashboard" : "Únete Ahora"}
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
