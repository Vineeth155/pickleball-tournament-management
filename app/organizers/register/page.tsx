"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function OrganizerRegisterPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [location, setLocation] = useState("");
  const [locationLink, setLocationLink] = useState("");
  const [aboutUs, setAboutUs] = useState("");

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name || !phone || !email || !location || !username || !password) {
      alert("Please fill in all required fields.");
      return;
    }

    setLoading(true);

    const res = await fetch("/api/organizers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        phone,
        email,
        location,
        locationLink,
        aboutUs,
        username,
        password,
        tournaments: [],
      }),
    });

    setLoading(false);

    if (res.ok) {
      const data = await res.json();

      // ✅ Save organizerId in localStorage
      if (typeof window !== "undefined") {
        localStorage.setItem("organizerId", data.organizerId);
      }

      router.push("/organizers");
    } else {
      alert("Failed to create organizer");
    }
  };

  return (
    <div className="max-w-2xl mx-auto mt-8">
      <Card>
        <CardHeader>
          <CardTitle>Register Organizer</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Name *</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div>
              <Label>Phone Number *</Label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />
            </div>

            <div>
              <Label>Email *</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div>
              <Label>Location *</Label>
              <Input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                required
              />
            </div>

            <div>
              <Label>Location Link</Label>
              <Input
                value={locationLink}
                onChange={(e) => setLocationLink(e.target.value)}
              />
            </div>

            <div>
              <Label>About Us</Label>
              <Textarea
                value={aboutUs}
                onChange={(e) => setAboutUs(e.target.value)}
              />
            </div>

            <div>
              <Label>Username *</Label>
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>

            <div>
              <Label>Password *</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Register Organizer"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
