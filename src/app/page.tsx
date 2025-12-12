'use client';

import { useAuth } from '@/context/auth-context';
import { useUserData, getFullName, getUserInitials } from '@/hooks/useUserData';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { TalaveraPattern } from '@/components/ui/TalaveraPattern';

export default function Home() {
  const { user, isAuthenticated, isLoading, isAdmin } = useAuth();
  const { userData } = useUserData();

  return (
    <div className="min-h-screen theme-transition">
      {/* Hero Section */}
      <section className="relative py-20 px-4 pb-38 overflow-hidden bg-gradient-to-br from-background via-surface to-primary/10">
        <TalaveraPattern variant="background" />
        
        {/* Talavera borders */}
        <div 
          className="absolute top-0 left-0 right-0 h-16 opacity-30 pointer-events-none"
          style={{
            backgroundImage: 'url(/talavera.png)',
            backgroundRepeat: 'repeat-x',
            backgroundSize: '240px auto'
          }}
        ></div>
        <div 
          className="absolute bottom-0 left-0 right-0 h-16 opacity-30 pointer-events-none"
          style={{
            backgroundImage: 'url(/talavera.png)',
            backgroundRepeat: 'repeat-x',
            backgroundSize: '240px auto'
          }}
        ></div>
        
        <div className="container mx-auto text-center relative z-10">
          <div className="flex justify-center mb-8 mt-12 animate-fade-in">
            <div className="relative group cursor-pointer">
              <img 
                src="/Logo.png" 
                alt="AWS User Group Puebla" 
                className="h-32 md:h-48 w-auto transition-all duration-500 ease-out group-hover:scale-110 group-hover:-translate-y-4 group-hover:drop-shadow-2xl animate-bounce-slow"
              />
              <div className="absolute inset-0 bg-accent/10 blur-3xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            </div>
          </div>
          
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

      {/* Red line to show section boundary */}
      <div className="w-full h-1 bg-red-500"></div>

      {/* User Status Card */}
      {isAuthenticated && user && (
        <section className="py-8 px-4 animate-fade-in">
          <div className="container mx-auto">
            <Card variant="talavera" className="hover:shadow-talavera-lg transition-all duration-300">
              <CardContent className="flex flex-col md:flex-row items-center justify-between p-6 gap-4">
                <div className="flex items-center space-x-4">
                  <div className="h-16 w-16 bg-gradient-to-br from-accent to-accent/70 rounded-full flex items-center justify-center shadow-talavera">
                    <span className="text-white font-bold text-2xl">
                      {getUserInitials(userData)}
                    </span>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-text-primary">
                      ¡Bienvenido, {getFullName(userData)}!
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

      {/* Become a Speaker Section - DUAL FLOW OPTIONS */}
      <section className="py-20 px-4 bg-gradient-to-br from-accent/5 via-surface to-background relative overflow-hidden">
        <TalaveraPattern variant="background" />
        <div className="container mx-auto relative z-10">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-text-primary">
              🎤 ¿Quieres ser Speaker?
            </h2>
            <p className="text-lg text-text-secondary max-w-2xl mx-auto">
              Comparte tu conocimiento con la comunidad. Elige la opción que mejor se adapte a ti:
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {/* Opción 1: Flujo Tradicional (Hybrid) */}
            <Card className="hover:shadow-2xl transition-all duration-300 hover:scale-105 border-2 border-border hover:border-accent/50">
              <CardHeader className="text-center pb-4">
                <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl">🚶‍♂️</span>
                </div>
                <CardTitle className="text-2xl mb-2">Flujo Tradicional</CardTitle>
                <CardDescription className="text-base">
                  Aplica primero, propón después
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-secondary/20 rounded-lg p-4 text-sm text-text-secondary">
                  <p className="mb-3"><strong className="text-text-primary">Perfecto si:</strong></p>
                  <ul className="space-y-2 list-disc list-inside">
                    <li>Aún no tienes una charla específica en mente</li>
                    <li>Quieres explorar la comunidad primero</li>
                    <li>Prefieres tomarte tu tiempo para decidir</li>
                  </ul>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-start gap-2">
                    <span className="text-green-600 mt-0.5">✓</span>
                    <span>Proceso gradual en 2 pasos</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-green-600 mt-0.5">✓</span>
                    <span>Completa tu perfil profesional</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-green-600 mt-0.5">✓</span>
                    <span>Propón tu charla cuando estés listo</span>
                  </div>
                </div>

                <Button 
                  variant="outline" 
                  className="w-full mt-4 border-2 hover:border-accent hover:bg-accent/10"
                  asChild
                >
                  <Link href={isAuthenticated ? "/profile#speaker-section" : "/auth/signin?redirect=/profile#speaker-section"}>
                    Aplicar como Speaker →
                  </Link>
                </Button>
              </CardContent>
            </Card>

            {/* Opción 2: Flujo Unificado (All-in-one) */}
            <Card className="hover:shadow-2xl transition-all duration-300 hover:scale-105 border-2 border-accent relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-accent text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
                RÁPIDO ⚡
              </div>
              <CardHeader className="text-center pb-4">
                <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl">🚀</span>
                </div>
                <CardTitle className="text-2xl mb-2">Flujo Unificado</CardTitle>
                <CardDescription className="text-base">
                  Aplica + Propón en un solo paso
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-accent/10 rounded-lg p-4 text-sm text-text-secondary border border-accent/20">
                  <p className="mb-3"><strong className="text-text-primary">Perfecto si:</strong></p>
                  <ul className="space-y-2 list-disc list-inside">
                    <li>Ya tienes una charla preparada</li>
                    <li>Quieres agilizar el proceso</li>
                    <li>Estás listo para compartir ahora</li>
                  </ul>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-start gap-2">
                    <span className="text-accent mt-0.5">✓</span>
                    <span>Todo en un solo formulario</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-accent mt-0.5">✓</span>
                    <span>Perfil + Propuesta juntos</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-accent mt-0.5">✓</span>
                    <span>Aprobación automática como speaker</span>
                  </div>
                </div>

                <Button 
                  variant="accent" 
                  className="w-full mt-4 shadow-lg hover:shadow-xl"
                  asChild
                >
                  <Link href={isAuthenticated ? "/speaker/apply-with-talk" : "/auth/signin?redirect=/speaker/apply-with-talk"}>
                    Aplicar + Proponer Charla ✨
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Info adicional */}
          <div className="mt-12 max-w-3xl mx-auto">
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6 text-center">
              <p className="text-sm text-text-secondary">
                <strong className="text-text-primary">💡 ¿No estás seguro cuál elegir?</strong>
                <br />
                Ambos caminos son válidos. Si tienes dudas, empieza con el flujo tradicional 
                y propón tu charla cuando te sientas listo.
              </p>
            </div>
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
