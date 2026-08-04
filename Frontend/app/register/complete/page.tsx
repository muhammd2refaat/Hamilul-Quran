"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BookOpen, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

// Maps the on-screen ijaza labels to the backend IjazaType enum values.
const IJAZA_OPTIONS: { value: string; label: string }[] = [
  { value: 'HIFZ', label: 'Ijazah in Hifz' },
  { value: 'TILAWAH', label: 'Ijazah in Tilawah' },
  { value: 'HAFS_AN_ASIM', label: 'Ijazah Hafs ʿan ʿAsim' },
  { value: 'TEN_QIRAAT', label: 'Ijazah in the Ten Qiraʾat' },
  { value: 'OTHER', label: 'Other' },
];

export default function CompleteRegistrationPage() {
  const router = useRouter();
  const [regToken, setRegToken] = useState<string | null>(null);
  const [role, setRole] = useState<'student' | 'teacher' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Shared
  const [fullName, setFullName] = useState('');
  const [age, setAge] = useState('');
  // Student
  const [country, setCountry] = useState('');
  const [phone, setPhone] = useState('');
  const [gender, setGender] = useState('MALE');
  // Teacher
  const [workedOnline, setWorkedOnline] = useState('false');
  const [juz, setJuz] = useState('');
  const [ijazas, setIjazas] = useState<string[]>([]);
  const [certificate, setCertificate] = useState<File | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('registration_token');
    const r = params.get('role');
    if (!token || (r !== 'student' && r !== 'teacher')) {
      setError('Missing or invalid registration link. Please sign in with Google again.');
      return;
    }
    setRegToken(token);
    setRole(r);
  }, []);

  function toggleIjaza(value: string) {
    setIjazas((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!regToken || !role) return;
    setIsLoading(true);
    setError(null);

    const form = new FormData();
    form.set('registration_token', regToken);
    form.set('full_name', fullName);
    if (age) form.set('age', age);

    if (role === 'student') {
      form.set('country', country);
      form.set('phone_number', phone);
      form.set('gender', gender);
    } else {
      form.set('worked_online_before', workedOnline);
      if (juz) form.set('juz_memorized', juz);
      ijazas.forEach((v) => form.append('ijazas', v));
      if (certificate) form.set('certificate', certificate);
    }

    try {
      const res = await fetch(`${API_BASE}/auth/google/complete-registration`, {
        method: 'POST',
        credentials: 'include',
        body: form,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || 'Registration failed. Please try again.');
      }
      router.replace(role === 'teacher' ? '/dashboard/teacher' : '/dashboard/student');
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md flex flex-col items-center">
        <div className="flex items-center gap-2 text-emerald-800 mb-6">
          <BookOpen className="h-8 w-8 text-emerald-600" />
          <span className="font-bold text-3xl tracking-tight">Hamilul-Quran</span>
        </div>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Card className="shadow-lg border-emerald-100">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">
              Complete your {role ?? ''} profile
            </CardTitle>
            <CardDescription className="text-center">
              A few more details to finish setting up your account.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!role ? (
              <div className="text-center text-sm text-destructive py-6">
                {error || 'Loading…'}
                <div className="mt-4">
                  <a href="/login" className="text-emerald-600 underline">Back to login</a>
                </div>
              </div>
            ) : (
              <form onSubmit={onSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full name</Label>
                  <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} required disabled={isLoading} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="age">Age</Label>
                  <Input id="age" type="number" min={1} value={age} onChange={(e) => setAge(e.target.value)} required disabled={isLoading} />
                </div>

                {role === 'student' && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="country">Country of residence</Label>
                      <Input id="country" value={country} onChange={(e) => setCountry(e.target.value)} required disabled={isLoading} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone number</Label>
                      <Input id="phone" placeholder="+1 555 000 0000" value={phone} onChange={(e) => setPhone(e.target.value)} required disabled={isLoading} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="gender">Gender</Label>
                      <select id="gender" className="w-full border rounded-md h-9 px-3 text-sm" value={gender} onChange={(e) => setGender(e.target.value)} disabled={isLoading}>
                        <option value="MALE">Male</option>
                        <option value="FEMALE">Female</option>
                      </select>
                    </div>
                  </>
                )}

                {role === 'teacher' && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="workedOnline">Have you taught online before?</Label>
                      <select id="workedOnline" className="w-full border rounded-md h-9 px-3 text-sm" value={workedOnline} onChange={(e) => setWorkedOnline(e.target.value)} disabled={isLoading}>
                        <option value="true">Yes</option>
                        <option value="false">No</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="juz">Juz memorized</Label>
                      <Input id="juz" type="number" min={0} max={30} value={juz} onChange={(e) => setJuz(e.target.value)} disabled={isLoading} />
                    </div>
                    <div className="space-y-2">
                      <Label>Ijaza(s) held — select all that apply</Label>
                      <div className="space-y-1">
                        {IJAZA_OPTIONS.map((opt) => (
                          <label key={opt.value} className="flex items-center gap-2 text-sm">
                            <input type="checkbox" checked={ijazas.includes(opt.value)} onChange={() => toggleIjaza(opt.value)} disabled={isLoading} />
                            {opt.label}
                          </label>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="certificate">Upload certificate (PDF / image)</Label>
                      <Input id="certificate" type="file" accept="application/pdf,image/png,image/jpeg" onChange={(e) => setCertificate(e.target.files?.[0] ?? null)} disabled={isLoading} />
                    </div>
                  </>
                )}

                {error && (
                  <div className="text-sm font-medium text-destructive text-center">{error}</div>
                )}

                <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white" disabled={isLoading}>
                  {isLoading ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating account…</>
                  ) : (
                    'Create account'
                  )}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
