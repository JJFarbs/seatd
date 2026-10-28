'use client';
import { useState, useRef, useEffect } from 'react';
import { todayStr } from '@/lib/data';
import { useApp, mutate, people, toast, authSignOut, saveProfileToDb, readAllNotifs, uploadAvatar, isPastItem } from '@/lib/store';
import { fmt, slotDay } from '@/lib/data';
import { Icon, Av, Empty, LogoMark, OfflineBar } from './ui';
import { UserTabbar } from './user';

export function ProfileScreen() {
  const s = useApp();
  const m = people.me;
  const unread = s.notifs.filter((n) => n.unread).length;
  const goLegal = (page) => mutate((x) => { x.legalPage = page; x.screen = 'legal'; });
  return (
    <>
      <OfflineBar />
      <div className="body enter">
        <div className="phero">
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}><Av p={m} size={88} /></div>
          <div className="h2" style={{ fontSize: 24 }}>{m.name}</div>
          <div className="sub">{m.handle}{s.session ? ` · ${s.session.user.email}` : ' · guest'}</div>
          <div className="sub" style={{ maxWidth: 280, margin: '8px auto 0' }}>{m.bio}</div>
          <div className="pstats">
            {(() => {
              const uid = s.session?.user?.id;
              const mineB = uid ? s.requests.filter((r) => r.userId === uid) : [];
              // real stats from your actual activity — demo numbers only without a database
              const stats = s.dbReady
                ? { nights: mineB.filter((r) => r.status === 'checkedin').length, tables: mineB.filter((r) => r.status === 'confirmed' || r.status === 'checkedin').length, crew: s.friends.length }
                : { nights: m.nights, tables: m.tables, crew: m.crew };
              return (
                <>
                  <div className="b"><div className="n">{stats.nights}</div><div className="l">Nights out</div></div>
                  <div className="b"><div className="n">{stats.tables}</div><div className="l">Tables</div></div>
                  <div className="b"><div className="n">{stats.crew}</div><div className="l">Crew</div></div>
                </>
              );
            })()}
          </div>
          <div className="promobox" style={{ textAlign: 'left', marginLeft: 'auto', marginRight: 'auto', maxWidth: 560 }}>
            <div className="row">
              <div><div style={{ fontWeight: 800 }}>Promoter mode</div><div className="meta2">Share your link and earn 8% on prepaid entry fees.</div></div>
              <span className="badge" style={{ background: 'rgba(255,194,75,.18)', color: 'var(--gold)' }}>{s.promoterCode}</span>
            </div>
          </div>
        </div>
        <div className="pad">
          <div className="featuregrid" style={{ gridTemplateColumns: 'repeat(2,minmax(0,1fr))' }}>
            <div className="featurecard" style={{ cursor: 'pointer' }} onClick={() => mutate((x) => { x.showFavs = true; x.tab = 'discover'; x.screen = 'home'; })}>
              <div className="n">{s.favs.length}</div><div className="l">Favourite clubs</div>
            </div>
            <div className="featurecard" style={{ cursor: 'pointer' }} onClick={() => mutate((x) => { x.tab = 'bookings'; x.screen = 'home'; })}>
              <div className="n">{s.session ? s.requests.filter((r) => r.userId === s.session.user.id).length : s.dbReady ? 0 : s.requests.filter((r) => r.who === 'You').length}</div><div className="l">Bookings</div>
            </div>
          </div>
          <div className="setrow" style={{ cursor: 'pointer' }} onClick={() => mutate((x) => { x.screen = 'notifs'; })}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ width: 22, height: 22, color: 'var(--magenta)' }}><Icon name="bell" size={22} /></span>
              <div className="nm" style={{ fontSize: 15 }}>Notifications</div>
              {unread > 0 && <span className="badge" style={{ background: 'var(--magenta)', color: '#0B0710' }}>{unread} new</span>}
            </div>
            <span style={{ color: 'var(--muted)' }}><Icon name="arrow" size={20} stroke={2.5} /></span>
          </div>
          <div className="setrow">
            <div><div className="nm" style={{ fontSize: 15 }}>Going out tonight</div><div className="meta2">Let your crew see you&apos;re out</div></div>
            <div className={`tog ${m.out ? 'on' : ''}`} role="switch" aria-checked={m.out} onClick={() => mutate(() => { m.out = !m.out; })}><i /></div>
          </div>
          <div className="setrow" style={{ cursor: 'pointer' }} onClick={() => mutate((x) => { x.tab = 'bookings'; x.screen = 'home'; })}>
            <div className="nm" style={{ fontSize: 15 }}>My bookings</div><span style={{ color: 'var(--muted)' }}><Icon name="arrow" size={20} stroke={2.5} /></span>
          </div>
          <div className="setrow" style={{ cursor: 'pointer' }} onClick={() => mutate((x) => { x.screen = 'previous'; })}>
            <div className="nm" style={{ fontSize: 15 }}>Previous bookings</div><span style={{ color: 'var(--muted)' }}><Icon name="arrow" size={20} stroke={2.5} /></span>
          </div>
          <div className="setrow" style={{ cursor: 'pointer' }} onClick={() => mutate((x) => { x.screen = 'editprofile'; })}>
            <div className="nm" style={{ fontSize: 15 }}>Edit profile</div><span style={{ color: 'var(--muted)' }}><Icon name="arrow" size={20} stroke={2.5} /></span>
          </div>
          <div className="eyebrow" style={{ marginTop: 24 }}>About</div>
          {[['terms', 'Terms of service'], ['privacy', 'Privacy policy'], ['faq', 'FAQ'], ['contact', 'Contact us']].map(([id, label]) => (
            <div className="setrow" key={id} style={{ cursor: 'pointer' }} onClick={() => goLegal(id)}>
              <div className="nm" style={{ fontSize: 15 }}>{label}</div><span style={{ color: 'var(--muted)' }}><Icon name="arrow" size={20} stroke={2.5} /></span>
            </div>
          ))}
          <button className="btn ghost" style={{ marginTop: 20, maxWidth: 400 }} onClick={authSignOut}>{s.session ? 'Log out' : 'Exit guest mode'}</button>
        </div>
      </div>
      <UserTabbar />
    </>
  );
}

export function EditProfile() {
  const s = useApp();
  const m = people.me;
  const [name, setName] = useState(m.name);
  const [handle, setHandle] = useState(m.handle);
  const [bio, setBio] = useState(m.bio);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef(null);
  const pickPhoto = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBusy(true);
    await uploadAvatar(file);
    setBusy(false);
  };
  return (
    <>
      <div className="topbar">
        <button className="back" aria-label="Back" onClick={() => mutate((x) => { x.screen = 'home'; })}><Icon name="back" size={22} stroke={2.8} /></button>
        <div className="h2">Edit profile</div>
      </div>
      <div className="body enter"><div className="pad" style={{ maxWidth: 680 }}>
        <div style={{ display: 'flex', justifyContent: 'center', margin: '6px 0 4px' }}><Av p={m} size={84} /></div>
        <div style={{ textAlign: 'center' }}>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={pickPhoto} />
          <button className="btn sm ghost" style={{ width: 'auto', padding: '8px 16px', margin: '8px auto 0' }} disabled={busy || !s.session}
            onClick={() => fileRef.current?.click()}>
            {busy ? 'Uploading…' : s.session ? 'Change photo' : 'Log in to set a photo'}
          </button>
        </div>
        <div className="field"><label>Name</label><input className="input" value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div className="field"><label>Username</label><input className="input" value={handle} onChange={(e) => setHandle(e.target.value)} /></div>
        <div className="field"><label>Bio</label><textarea className="input" rows={3} value={bio} onChange={(e) => setBio(e.target.value)} /></div>
        <button className="btn" style={{ marginTop: 22 }} onClick={() => {
          const newName = name.trim() || m.name;
          const newHandle = handle.trim() ? (handle.startsWith('@') ? handle : '@' + handle) : m.handle;
          mutate((x) => {
            m.name = newName;
            m.handle = newHandle;
            m.bio = bio;
            x.screen = 'home';
          });
          saveProfileToDb({ name: newName, handle: newHandle, bio });
          toast('Profile saved');
        }}>Save changes</button>
      </div></div>
    </>
  );
}

// Bookings and tickets move here 24 hours after the event is over.
export function PreviousBookings() {
  const s = useApp();
  const uid = s.session?.user?.id;
  const bookings = uid ? s.requests.filter((r) => isPastItem(r) && (r.userId === uid || (r.payments || []).some((p) => p.id === uid))) : [];
  const tickets = uid ? s.ticketPurchases.filter((p) => isPastItem(p) && p.userId === uid) : [];
  const items = [
    ...bookings.map((r) => ({ id: r.id, at: r.slotDate ? Date.parse(r.slotDate) : r.createdAt, title: `${r.venue} — ${r.table}`, sub: `${r.slotTime ? 'Reservation' : 'Table'} · ${(r.party || r.men + r.women)} guests`, total: r.paidNow || r.total, status: r.status, code: r.code, date: r.slotDate ? slotDay(r.slotDate) + ' · ' + r.slotTime : r.date })),
    ...tickets.map((p) => ({ id: p.id, at: p.createdAt, title: `${p.venue} — ${p.ticketName}`, sub: `${p.qty}× ticket`, total: p.total, status: p.status, code: p.code, date: p.date })),
  ].sort((a, b) => (b.at || 0) - (a.at || 0));
  const label = (st) => (st === 'checkedin' ? 'ATTENDED' : st === 'confirmed' ? 'COMPLETED' : String(st || '').toUpperCase());
  return (
    <>
      <OfflineBar />
      <div className="topbar">
        <button className="back" aria-label="Back" onClick={() => mutate((x) => { x.screen = 'home'; x.tab = 'profile'; })}><Icon name="back" size={22} stroke={2.8} /></button>
        <div className="h2" style={{ fontSize: 20 }}>Previous bookings</div>
      </div>
      <div className="body enter"><div className="pad">
        {items.length ? items.map((it) => (
          <div className="req" key={it.id}>
            <div className="row">
              <div>
                <div className="nm" style={{ fontSize: 17, fontWeight: 800 }}>{it.title}</div>
                <div className="meta2">{it.sub} · {it.date || ''}</div>
              </div>
              <span className="badge" style={{ background: 'rgba(255,255,255,.08)', color: 'var(--muted)' }}>{label(it.status)}</span>
            </div>
            <div className="summary" style={{ marginTop: 12 }}>
              <div className="li"><span>Reference</span><b>{it.code || it.id}</b></div>
              <div className="li"><span>Paid</span><b>{fmt(it.total || 0)}</b></div>
            </div>
          </div>
        )) : <Empty>No previous bookings yet.<br />Bookings and tickets show up here 24 hours after the event.</Empty>}
      </div></div>
      <UserTabbar />
    </>
  );
}

export function NotifScreen() {
  const s = useApp();
  // opening the tab clears the alerts, same as opening a chat clears its unread badge
  useEffect(() => { readAllNotifs(); }, []);
  return (
    <>
      <div className="topbar">
        <button className="back" aria-label="Back" onClick={() => mutate((x) => { x.screen = 'home'; })}><Icon name="back" size={22} stroke={2.8} /></button>
        <div className="h2">Notifications</div>
      </div>
      <div className="body enter"><div className="pad">
        {s.notifs.length ? s.notifs.map((n) => (
          <div className={`notifrow ${n.unread ? 'unread' : ''}`} key={n.id}>
            <div className="nico"><Icon name={n.icon === 'check' ? 'bolt' : n.icon} size={20} /></div>
            <div style={{ flex: 1, minWidth: 0 }}><div className="ntxt">{n.text}</div><div className="ntime">{n.time}</div></div>
            {n.unread && <span className="badge" style={{ background: 'rgba(255,61,174,.16)', color: 'var(--magenta)' }}>NEW</span>}
          </div>
        )) : <Empty>All caught up.<br />Payment pings, approvals and invites land here.</Empty>}
        {s.notifs.some((n) => n.unread) && (
          <button className="btn ghost sm" style={{ marginTop: 18, maxWidth: 300 }} onClick={readAllNotifs}>Mark all as read</button>
        )}
      </div></div>
      <UserTabbar />
    </>
  );
}

const FAQS = [
  ['How do refunds work?', 'If the club declines your request, or your group misses the 20-minute payment window, every paid share is automatically refunded to the original card.'],
  ['What is the 5% service charge?', "It's Seat'd's platform fee, added to the table minimum. The minimum spend itself becomes bar credit at your table."],
  ['Can I change my table after booking?', 'Before club approval, cancel and rebook. After approval, message the venue via VIP contact on the club page.'],
  ['How does split-pay work?', 'You pay your share upfront; invited friends get their own payment pings. The booking confirms once everyone has paid and the club approves.'],
  ["What if my friends bail?", "If invited friends don't pay in 20 minutes, the booking auto-cancels and you get refunded. You can also mark shares as paid to cover them yourself."],
];
export function LegalScreen() {
  const s = useApp();
  const page = s.legalPage || 'terms';
  const titles = { terms: 'Terms of service', privacy: 'Privacy policy', contact: 'Contact us', faq: 'FAQ' };
  return (
    <>
      <div className="topbar">
        <button className="back" aria-label="Back" onClick={() => mutate((x) => { x.screen = 'home'; })}><Icon name="back" size={22} stroke={2.8} /></button>
        <div className="h2">{titles[page]}</div>
      </div>
      <div className="body enter"><div className="pad legalbody">
        {page === 'terms' && (
          <>
            <p className="meta2" style={{ marginBottom: 6 }}>Effective date: {todayStr()}</p>
            <h3>1. Agreement to these terms</h3>
            <p>These Terms of Service (&quot;Terms&quot;) govern your access to and use of the Seat&apos;d website, mobile experience and related services (together, the &quot;Service&quot;), operated from South Africa. By creating an account, browsing clubs, booking a table, buying a ticket, or otherwise using the Service, you agree to be bound by these Terms. If you do not agree, do not use the Service.</p>

            <h3>2. What Seat&apos;d is (and isn&apos;t)</h3>
            <p>Seat&apos;d is a booking platform that connects guests with independent nightlife venues (&quot;Venues&quot;) for the purpose of reserving tables and purchasing single-entry tickets. Seat&apos;d is not a Venue, does not own or operate any club, and is not responsible for the premises, staff, music, décor, alcohol service, or entry decisions of any Venue. Each Venue is solely responsible for its own compliance with liquor licensing, health and safety, fire, and other applicable laws.</p>

            <h3>3. Eligibility &amp; accounts</h3>
            <p>You must be at least 18 years old to create an account or use the Service, in line with the legal drinking age in South Africa. You are responsible for the accuracy of the information you provide, for keeping your login credentials confidential, and for all activity that occurs under your account. Notify us immediately at <a href="mailto:support@seatedbookings.com" style={{ color: 'var(--blue)' }}>support@seatedbookings.com</a> if you suspect unauthorised use of your account.</p>

            <h3>4. Table bookings</h3>
            <p>When you book a table, you agree to pay the Venue&apos;s minimum spend for that table plus Seat&apos;d&apos;s service charge (currently 5%), collected upfront. The minimum spend is credited to your table as bar credit on the night. If you invite friends and enable split-pay, each invited guest is responsible for their own share; if outstanding shares are not paid within the payment window shown in the app, the booking is automatically cancelled and any amounts already paid are refunded to the payer. A Venue may decline a booking request, in which case any amount paid is refunded in full.</p>

            <h3>5. Single tickets</h3>
            <p>Where a Venue offers single-entry tickets through Seat&apos;d, each ticket purchase is limited to the quantity available as set by the Venue. Tickets are non-transferable outside the app&apos;s own sharing features and are void if the QR code has already been redeemed. Ticket prices, availability and any age or dress requirements are set by the Venue, not by Seat&apos;d.</p>

            <h3>6. Open tables &amp; joining other guests</h3>
            <p>A guest who books a table may choose to make it &quot;public&quot;, allowing other users to request a paid seat at that table. Approving or declining a join request is entirely at the discretion of the table&apos;s host. Seat&apos;d facilitates the payment and messaging around this feature but is not a party to, and accepts no responsibility for, any arrangement between guests.</p>

            <h3>7. Pricing, fees &amp; payments</h3>
            <p>All prices are shown in South African Rand and include the Seat&apos;d service charge where applicable. Payments are processed by third-party, PCI-compliant payment providers; Seat&apos;d does not store your full card details. Prices set by Venues (minimum spend, ticket prices, join prices) are set independently by each Venue, and Seat&apos;d is not responsible for pricing disputes with a Venue beyond amounts collected through the Service.</p>

            <h3>8. Cancellations, no-shows &amp; refunds</h3>
            <p>You may cancel an unconfirmed booking before a Venue approves it. Once a Venue has confirmed a booking or ticket, cancellation and refund eligibility is at that Venue&apos;s discretion, communicated via the Venue&apos;s listed VIP contact. Automatic refunds apply where: (a) a Venue declines a request, (b) a split-pay booking auto-cancels because not everyone paid in time, or (c) a public table fills up before your join request is processed. Refunds are returned to the original payment method within 3–5 business days.</p>

            <h3>9. Promoter program</h3>
            <p>Promoter codes are used to track referral commissions payable by Venues to promoters; they do not change the price a guest pays. Misuse of promoter codes (including self-referral fraud) may result in suspension of the promoter account and forfeiture of unpaid commissions.</p>

            <h3>10. For venue &amp; club owners</h3>
            <p>If you register a Venue on Seat&apos;d, you confirm you are authorised to represent that Venue and to accept bookings, list tables, tickets, pricing and a bottle/drink menu on its behalf. You are responsible for keeping your listed availability, pricing and layout accurate, for honouring confirmed bookings and tickets, and for all decisions relating to entry, service and conduct on your premises. Seat&apos;d may review, approve, suspend or remove a Venue listing at its discretion, including for inaccurate listings, repeated guest complaints, or non-payment of platform fees.</p>

            <h3>11. Acceptable use</h3>
            <p>You agree not to: misrepresent your identity or age; use the Service for any unlawful purpose; harass, threaten or defraud other users or Venues; attempt to circumvent payment, security or rate-limiting measures; scrape or resell listings without permission; or upload content that is defamatory, obscene, or infringes another person&apos;s rights. We may suspend or terminate accounts that breach this section.</p>

            <h3>12. Reviews &amp; user content</h3>
            <p>Reviews, messages, profile photos and other content you submit must be your own honest experience or lawful content you have the right to share. You grant Seat&apos;d a licence to display this content within the Service. We may remove content that violates these Terms or applicable law, and we do not guarantee that reviews reflect every guest&apos;s experience.</p>

            <h3>13. Assumption of risk</h3>
            <p>Nightlife venues involve inherent risks, including but not limited to alcohol service, crowded spaces, and late-night travel. You attend Venues at your own risk. Venues may refuse entry or remove a guest for intoxication, dress code, capacity, or safety reasons, and Seat&apos;d is not liable for such decisions or for any injury, loss or damage arising from your attendance at a Venue.</p>

            <h3>14. Disclaimers &amp; limitation of liability</h3>
            <p>The Service is provided &quot;as is&quot; without warranties of any kind, express or implied. To the maximum extent permitted by law, Seat&apos;d&apos;s total liability to you for any claim arising from your use of the Service is limited to the amount you paid to Seat&apos;d in the 3 months preceding the claim. Seat&apos;d is not liable for indirect, incidental or consequential loss, or for the acts or omissions of any Venue or other user.</p>

            <h3>15. Indemnity</h3>
            <p>You agree to indemnify and hold Seat&apos;d harmless from any claim, loss or expense (including reasonable legal costs) arising from your breach of these Terms, your misuse of the Service, or your conduct at a Venue.</p>

            <h3>16. Suspension &amp; termination</h3>
            <p>We may suspend or close your account at any time for breach of these Terms, suspected fraud, or misuse of the Service. You may close your account at any time by contacting <a href="mailto:support@seatedbookings.com" style={{ color: 'var(--blue)' }}>support@seatedbookings.com</a>. Sections of these Terms that by their nature should survive termination (including liability, indemnity and governing law) will continue to apply.</p>

            <h3>17. Changes to these terms</h3>
            <p>We may update these Terms from time to time as the Service evolves. Material changes will be reflected by updating the effective date above. Continued use of the Service after changes take effect constitutes acceptance of the updated Terms.</p>

            <h3>18. Governing law &amp; disputes</h3>
            <p>These Terms are governed by the laws of the Republic of South Africa. Any dispute arising from these Terms or your use of the Service is subject to the non-exclusive jurisdiction of the South African courts, without prejudice to your statutory rights as a consumer under the Consumer Protection Act.</p>

            <h3>19. Contact</h3>
            <p>Questions about these Terms can be sent to <a href="mailto:support@seatedbookings.com" style={{ color: 'var(--blue)' }}>support@seatedbookings.com</a>.</p>
          </>
        )}
        {page === 'privacy' && (
          <>
            <p className="meta2" style={{ marginBottom: 6 }}>Effective date: {todayStr()}</p>
            <h3>1. Introduction</h3>
            <p>This Privacy Policy explains how Seat&apos;d collects, uses, stores and protects your personal information when you use the Service. It is written to align with South Africa&apos;s Protection of Personal Information Act (POPIA). By using Seat&apos;d you consent to the processing described here.</p>

            <h3>2. Information we collect</h3>
            <p><b>Account &amp; profile:</b> name, username, email address, password (stored securely by our authentication provider, never in plain text), optional bio, and profile photo.</p>
            <p><b>Booking &amp; ticket data:</b> the tables you book, tickets you buy, party size, amounts paid, promoter codes used, and booking references.</p>
            <p><b>Social features:</b> friends/crew connections, direct messages, table group chats, favourites, and notifications you send or receive within the app.</p>
            <p><b>Venue data (club owners):</b> venue details, floor layout, ticket types and pricing, bottle menu, and the location you place on the map.</p>
            <p><b>Location:</b> if you tap &quot;Find me&quot; on the map, we request your device&apos;s GPS location via your browser — only with your permission, and only to centre the map. We do not track your location in the background.</p>
            <p><b>Device &amp; usage data:</b> basic technical data such as browser type and general usage of the app, used only to keep the Service working reliably.</p>
            <p><b>Payments:</b> Seat&apos;d is integrating real payment processing; once live, payments will be handled by a registered, PCI-compliant payment provider and Seat&apos;d will never see or store your full card number. Until that integration goes live, no real card charges are made through the Service.</p>

            <h3>3. How we use your information</h3>
            <p>We use your information to operate bookings and ticket sales, run the social features you opt into (friends, chats, favourites), communicate booking-related notifications, prevent fraud and abuse, and improve the Service. We do not sell your personal information to third parties.</p>

            <h3>4. Legal basis for processing</h3>
            <p>We process your information because it is necessary to perform our contract with you (fulfilling bookings and tickets), because you have consented (e.g. location access, optional profile fields), or because we have a legitimate interest in keeping the Service secure and reliable.</p>

            <h3>5. Who we share information with</h3>
            <p>We share the minimum information needed with: the Venue you book or buy a ticket from (your name, party details and contact needed to honour the booking); our hosting and database provider, which stores and processes data on our behalf under contract; and our payment provider, once live payment processing is enabled. We do not share your data with advertisers.</p>

            <h3>6. Where your data is stored</h3>
            <p>Seat&apos;d&apos;s database and file storage are hosted by our infrastructure provider in the European Union (Ireland). This means your information is transferred outside South Africa for processing. We only use providers that are contractually bound to protect your data to a standard consistent with POPIA.</p>

            <h3>7. Profile photos</h3>
            <p>Profile photos you upload are stored in a public file bucket and are accessible via a direct link to anyone who has that link (for example, to show your photo to friends in the app). Avoid uploading a photo you would not want to be publicly viewable via its link.</p>

            <h3>8. Cookies &amp; local storage</h3>
            <p>Seat&apos;d uses your browser&apos;s local storage (not tracking cookies) to keep you signed in between visits. We do not use third-party advertising trackers.</p>

            <h3>9. Data retention</h3>
            <p>We keep your account and booking history for as long as your account is active, and for a reasonable period after closure to meet legal, accounting and fraud-prevention obligations. You can request earlier deletion — see your rights below.</p>

            <h3>10. Security</h3>
            <p>We use industry-standard measures, including row-level access controls on our database, to restrict who can read or change your data. No system is 100% secure, and we encourage you to use a strong, unique password.</p>

            <h3>11. Your rights</h3>
            <p>Under POPIA you have the right to: know what personal information we hold about you; request a copy of it; correct inaccurate information; request deletion of your information; and object to certain processing. To exercise any of these rights, email <a href="mailto:privacy@seatedbookings.com" style={{ color: 'var(--blue)' }}>privacy@seatedbookings.com</a>. You can also delete favourites, friends, messages and your profile photo directly within the app at any time.</p>

            <h3>12. Children</h3>
            <p>Seat&apos;d is intended for users aged 18 and over and is not directed at children. We do not knowingly collect personal information from anyone under 18.</p>

            <h3>13. Complaints</h3>
            <p>If you believe we have not handled your personal information properly, you can contact us first at <a href="mailto:privacy@seatedbookings.com" style={{ color: 'var(--blue)' }}>privacy@seatedbookings.com</a>, or lodge a complaint with South Africa&apos;s Information Regulator (inforeg.org.za).</p>

            <h3>14. Changes to this policy</h3>
            <p>We may update this Privacy Policy as the Service evolves. Material changes will be reflected by updating the effective date above.</p>

            <h3>15. Contact</h3>
            <p>Privacy questions or requests: <a href="mailto:privacy@seatedbookings.com" style={{ color: 'var(--blue)' }}>privacy@seatedbookings.com</a>.</p>
          </>
        )}
        {page === 'contact' && (
          <>
            <h3>Talk to us</h3>
            <p>Support: <a href="mailto:support@seatedbookings.com" style={{ color: 'var(--blue)' }}>support@seatedbookings.com</a></p>
            <p>Venues &amp; partnerships: <a href="mailto:venues@seatedbookings.com" style={{ color: 'var(--blue)' }}>venues@seatedbookings.com</a></p>
            <p>WhatsApp line: +27 10 555 0123 (Thu–Sun 18:00–04:00)</p>
            <p>Johannesburg HQ: 24 Central, Gwen Lane, Sandton.</p>
          </>
        )}
        {page === 'faq' && FAQS.map(([q, a], i) => (
          <details className="faq" key={i}><summary>{q}</summary><div className="ans">{a}</div></details>
        ))}
        <div className="micro" style={{ marginTop: 26 }}>Seat&apos;d · Johannesburg, South Africa · Last updated {todayStr()}</div>
      </div></div>
      <UserTabbar />
    </>
  );
}

export function NotFound() {
  return (
    <div className="center enter">
      <LogoMark size={74} />
      <div className="h1" style={{ fontSize: 64, marginTop: 14 }}>404</div>
      <div className="sub" style={{ maxWidth: 280 }}>This page slipped past the bouncer. It doesn&apos;t exist — or it went home early.</div>
      <button className="btn" style={{ width: 'auto', padding: '14px 28px', marginTop: 18 }} onClick={() => mutate((x) => { x.screen = 'home'; x.tab = 'discover'; })}>Back to Tonight</button>
    </div>
  );
}
