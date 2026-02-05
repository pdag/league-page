<script>
  import { onMount } from 'svelte';
  import Button from '@smui/button';
  import Textfield from '@smui/textfield';
  import LinearProgress from '@smui/linear-progress';
  
  // State
  let loading = $state(true);
  let authenticated = $state(false);
  let profile = $state(null);
  let error = $state('');
  let success = $state('');
  
  // Verification state
  let verificationStep = $state('username'); // 'username', 'pending', 'complete'
  let sleeperUsername = $state('');
  let verificationCode = $state('');
  let sleeperUserId = $state('');
  let verifying = $state(false);
  
  // Form state
  let saving = $state(false);
  let formData = $state({
    name: '',
    location: '',
    bio: '',
    photo_url: '',
    fantasy_start_year: null,
    favorite_team: '',
    mode: '',
    rival_name: '',
    rival_manager_id: '',
    favorite_player_id: null,
    value_position: '',
    rookie_or_vets: '',
    philosophy: '',
    trading_scale: 5,
    preferred_contact: ''
  });

  const nflTeams = [
    { code: '', name: 'Select Team' },
    { code: 'ari', name: 'Arizona Cardinals' },
    { code: 'atl', name: 'Atlanta Falcons' },
    { code: 'bal', name: 'Baltimore Ravens' },
    { code: 'buf', name: 'Buffalo Bills' },
    { code: 'car', name: 'Carolina Panthers' },
    { code: 'chi', name: 'Chicago Bears' },
    { code: 'cin', name: 'Cincinnati Bengals' },
    { code: 'cle', name: 'Cleveland Browns' },
    { code: 'dal', name: 'Dallas Cowboys' },
    { code: 'den', name: 'Denver Broncos' },
    { code: 'det', name: 'Detroit Lions' },
    { code: 'gb', name: 'Green Bay Packers' },
    { code: 'hou', name: 'Houston Texans' },
    { code: 'ind', name: 'Indianapolis Colts' },
    { code: 'jax', name: 'Jacksonville Jaguars' },
    { code: 'kc', name: 'Kansas City Chiefs' },
    { code: 'lac', name: 'Los Angeles Chargers' },
    { code: 'lar', name: 'Los Angeles Rams' },
    { code: 'lv', name: 'Las Vegas Raiders' },
    { code: 'mia', name: 'Miami Dolphins' },
    { code: 'min', name: 'Minnesota Vikings' },
    { code: 'ne', name: 'New England Patriots' },
    { code: 'no', name: 'New Orleans Saints' },
    { code: 'nyg', name: 'New York Giants' },
    { code: 'nyj', name: 'New York Jets' },
    { code: 'phi', name: 'Philadelphia Eagles' },
    { code: 'pit', name: 'Pittsburgh Steelers' },
    { code: 'sea', name: 'Seattle Seahawks' },
    { code: 'sf', name: 'San Francisco 49ers' },
    { code: 'tb', name: 'Tampa Bay Buccaneers' },
    { code: 'ten', name: 'Tennessee Titans' },
    { code: 'wsh', name: 'Washington Commanders' }
  ];

  const modes = ['', 'Win Now', 'Dynasty', 'Rebuild'];
  const positions = ['', 'QB', 'RB', 'WR', 'TE', 'K', 'DEF'];
  const rookieOrVetsOptions = ['', 'Rookies', 'Vets'];
  const contactMethods = ['', 'Text', 'WhatsApp', 'Sleeper', 'Email', 'Phone', 'Discord', 'Carrier Pigeon'];

  onMount(async () => {
    await checkAuth();
  });

  async function checkAuth() {
    loading = true;
    error = '';
    try {
      const res = await fetch('/api/manager/profile');
      const data = await res.json();
      
      if (data.authenticated) {
        authenticated = true;
        profile = data.profile;
        verificationStep = 'complete';
        // Populate form with existing data
        Object.keys(formData).forEach(key => {
          if (data.profile[key] !== null && data.profile[key] !== undefined) {
            formData[key] = data.profile[key];
          }
        });
      } else {
        authenticated = false;
        verificationStep = 'username';
      }
    } catch (e) {
      console.error('Auth check failed:', e);
      error = 'Failed to check authentication status';
    } finally {
      loading = false;
    }
  }

  async function startVerification() {
    if (!sleeperUsername.trim()) {
      error = 'Please enter your Sleeper username';
      return;
    }

    verifying = true;
    error = '';
    
    try {
      const res = await fetch('/api/manager/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sleeper_username: sleeperUsername.trim() })
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.message || 'Verification failed');
      }
      
      verificationCode = data.verification_code;
      sleeperUserId = data.sleeper_user_id;
      verificationStep = 'pending';
    } catch (e) {
      error = e.message || 'Failed to start verification';
    } finally {
      verifying = false;
    }
  }

  async function completeVerification() {
    verifying = true;
    error = '';
    
    try {
      const res = await fetch('/api/manager/verify', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sleeper_user_id: sleeperUserId })
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.message || 'Verification failed');
      }
      
      // Verification successful, reload profile
      await checkAuth();
      success = 'Verification successful! You can now edit your profile.';
    } catch (e) {
      error = e.message || 'Verification failed. Make sure the code is in your Sleeper team name or display name.';
    } finally {
      verifying = false;
    }
  }

  async function logout() {
    try {
      await fetch('/api/manager/verify', { method: 'DELETE' });
      authenticated = false;
      profile = null;
      verificationStep = 'username';
      sleeperUsername = '';
      verificationCode = '';
      sleeperUserId = '';
      success = '';
    } catch (e) {
      console.error('Logout failed:', e);
    }
  }

  async function saveProfile() {
    saving = true;
    error = '';
    success = '';
    
    try {
      const res = await fetch('/api/manager/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.message || 'Failed to save profile');
      }
      
      success = 'Profile saved successfully!';
      profile = data.profile;
    } catch (e) {
      error = e.message || 'Failed to save profile';
    } finally {
      saving = false;
    }
  }

  function cancelVerification() {
    verificationStep = 'username';
    verificationCode = '';
    sleeperUserId = '';
    error = '';
  }
</script>

<svelte:head>
  <title>Edit Profile | League Page</title>
</svelte:head>

<style>
  .profilePage {
    max-width: 800px;
    margin: 2em auto;
    padding: 0 1em;
  }

  h1 {
    text-align: center;
    margin-bottom: 1em;
  }

  .card {
    background: var(--paperOne, #fff);
    border-radius: 8px;
    padding: 2em;
    margin-bottom: 2em;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  .verificationCard {
    text-align: center;
  }

  .verificationCard h2 {
    margin-bottom: 1em;
  }

  .verificationCard p {
    color: #666;
    margin-bottom: 1.5em;
    line-height: 1.6;
  }

  .codeDisplay {
    background: var(--blueOne, #1a73e8);
    color: white;
    font-size: 2em;
    font-weight: bold;
    letter-spacing: 0.2em;
    padding: 0.5em 1em;
    border-radius: 8px;
    margin: 1em 0;
    display: inline-block;
    font-family: monospace;
  }

  .steps {
    text-align: left;
    background: #f5f5f5;
    padding: 1.5em;
    border-radius: 8px;
    margin: 1.5em 0;
  }

  .steps ol {
    margin: 0;
    padding-left: 1.5em;
  }

  .steps li {
    margin-bottom: 0.5em;
    line-height: 1.5;
  }

  .inputGroup {
    margin-bottom: 1.5em;
  }

  .inputGroup label {
    display: block;
    margin-bottom: 0.5em;
    font-weight: 500;
    color: #333;
  }

  .inputGroup input,
  .inputGroup select,
  .inputGroup textarea {
    width: 100%;
    padding: 0.75em;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 1em;
    background: var(--paperTwo, #fff);
    color: var(--fontColor, #333);
  }

  .inputGroup textarea {
    min-height: 100px;
    resize: vertical;
  }

  .inputGroup input:focus,
  .inputGroup select:focus,
  .inputGroup textarea:focus {
    outline: none;
    border-color: var(--blueOne, #1a73e8);
    box-shadow: 0 0 0 2px rgba(26, 115, 232, 0.2);
  }

  .inputGroup small {
    display: block;
    margin-top: 0.25em;
    color: #888;
    font-size: 0.85em;
  }

  .formGrid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1em;
  }

  .formSection {
    margin-bottom: 2em;
  }

  .formSection h3 {
    border-bottom: 2px solid var(--blueOne, #1a73e8);
    padding-bottom: 0.5em;
    margin-bottom: 1em;
    color: var(--blueOne, #1a73e8);
  }

  .buttonGroup {
    display: flex;
    gap: 1em;
    justify-content: center;
    margin-top: 1.5em;
    flex-wrap: wrap;
  }

  .error {
    background: #fee;
    color: #c00;
    padding: 1em;
    border-radius: 4px;
    margin-bottom: 1em;
    text-align: center;
  }

  .success {
    background: #efe;
    color: #060;
    padding: 1em;
    border-radius: 4px;
    margin-bottom: 1em;
    text-align: center;
  }

  .loading {
    display: block;
    width: 85%;
    max-width: 500px;
    margin: 80px auto;
    text-align: center;
  }

  .headerRow {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1em;
    flex-wrap: wrap;
    gap: 1em;
  }

  .headerRow h2 {
    margin: 0;
  }

  .userInfo {
    display: flex;
    align-items: center;
    gap: 0.5em;
    color: #666;
  }

  .rangeValue {
    display: flex;
    align-items: center;
    gap: 1em;
  }

  .rangeValue input[type="range"] {
    flex: 1;
  }

  .rangeValue span {
    min-width: 2em;
    text-align: center;
    font-weight: bold;
  }

  @media (max-width: 600px) {
    .card {
      padding: 1em;
    }

    .formGrid {
      grid-template-columns: 1fr;
    }

    .headerRow {
      flex-direction: column;
      text-align: center;
    }
  }
</style>

<div class="profilePage">
  <h1>Manager Profile</h1>

  {#if loading}
    <div class="loading">
      <p>Loading...</p>
      <LinearProgress indeterminate />
    </div>
  {:else if verificationStep === 'username'}
    <div class="card verificationCard">
      <h2>Verify Your Sleeper Account</h2>
      <p>
        To edit your manager profile, you need to verify that you own a Sleeper account 
        that is part of this league. Enter your Sleeper username to get started.
      </p>

      {#if error}
        <div class="error">{error}</div>
      {/if}

      <div class="inputGroup">
        <Textfield 
          bind:value={sleeperUsername}
          label="Sleeper Username"
          style="width: 100%; max-width: 300px;"
          disabled={verifying}
        />
      </div>

      <div class="buttonGroup">
        <Button 
          variant="raised" 
          onclick={startVerification}
          disabled={verifying || !sleeperUsername.trim()}
        >
          {verifying ? 'Starting Verification...' : 'Start Verification'}
        </Button>
      </div>
    </div>

  {:else if verificationStep === 'pending'}
    <div class="card verificationCard">
      <h2>Complete Verification</h2>
      <p>
        Add this verification code to your <strong>Sleeper team name</strong> or <strong>display name</strong>:
      </p>
      
      <div class="codeDisplay">{verificationCode}</div>

      <div class="steps">
        <ol>
          <li>Open the Sleeper app</li>
          <li>Go to your league settings or profile</li>
          <li>Add the code <strong>{verificationCode}</strong> to your team name or display name</li>
          <li>Come back here and click "Verify Now"</li>
          <li>After verification, you can remove the code</li>
        </ol>
      </div>

      {#if error}
        <div class="error">{error}</div>
      {/if}

      <div class="buttonGroup">
        <Button 
          variant="outlined" 
          onclick={cancelVerification}
          disabled={verifying}
        >
          Cancel
        </Button>
        <Button 
          variant="raised" 
          onclick={completeVerification}
          disabled={verifying}
        >
          {verifying ? 'Verifying...' : 'Verify Now'}
        </Button>
      </div>
    </div>

  {:else if authenticated}
    <div class="card">
      <div class="headerRow">
        <h2>Edit Your Profile</h2>
        <div class="userInfo">
          <span>Logged in as: <strong>{profile?.sleeper_username || profile?.sleeper_display_name}</strong></span>
          <Button variant="outlined" onclick={logout}>Logout</Button>
        </div>
      </div>

      {#if error}
        <div class="error">{error}</div>
      {/if}

      {#if success}
        <div class="success">{success}</div>
      {/if}

      <form onsubmit={(e) => { e.preventDefault(); saveProfile(); }}>
        <div class="formSection">
          <h3>Basic Information</h3>
          <div class="formGrid">
            <div class="inputGroup">
              <label for="name">Display Name</label>
              <input 
                type="text" 
                id="name" 
                bind:value={formData.name}
                placeholder="Your name"
              />
            </div>
            <div class="inputGroup">
              <label for="location">Location</label>
              <input 
                type="text" 
                id="location" 
                bind:value={formData.location}
                placeholder="City, State"
              />
            </div>
          </div>
          <div class="inputGroup">
            <label for="bio">Bio</label>
            <textarea 
              id="bio" 
              bind:value={formData.bio}
              placeholder="Tell us about yourself..."
            ></textarea>
          </div>
          <div class="inputGroup">
            <label for="photo_url">Photo URL</label>
            <input 
              type="url" 
              id="photo_url" 
              bind:value={formData.photo_url}
              placeholder="https://example.com/your-photo.jpg"
            />
            <small>Square ratio recommended (no larger than 500x500)</small>
          </div>
        </div>

        <div class="formSection">
          <h3>Fantasy Football Details</h3>
          <div class="formGrid">
            <div class="inputGroup">
              <label for="fantasy_start_year">Playing Fantasy Since</label>
              <input 
                type="number" 
                id="fantasy_start_year" 
                bind:value={formData.fantasy_start_year}
                placeholder="2015"
                min="1990"
                max="2026"
              />
            </div>
            <div class="inputGroup">
              <label for="favorite_team">Favorite NFL Team</label>
              <select id="favorite_team" bind:value={formData.favorite_team}>
                {#each nflTeams as team}
                  <option value={team.code}>{team.name}</option>
                {/each}
              </select>
            </div>
            <div class="inputGroup">
              <label for="mode">Team Mode</label>
              <select id="mode" bind:value={formData.mode}>
                {#each modes as mode}
                  <option value={mode}>{mode || 'Select Mode'}</option>
                {/each}
              </select>
            </div>
            <div class="inputGroup">
              <label for="value_position">Favorite Position</label>
              <select id="value_position" bind:value={formData.value_position}>
                {#each positions as pos}
                  <option value={pos}>{pos || 'Select Position'}</option>
                {/each}
              </select>
            </div>
            <div class="inputGroup">
              <label for="rookie_or_vets">Roster Preference</label>
              <select id="rookie_or_vets" bind:value={formData.rookie_or_vets}>
                {#each rookieOrVetsOptions as option}
                  <option value={option}>{option || 'Select Preference'}</option>
                {/each}
              </select>
            </div>
            <div class="inputGroup">
              <label for="favorite_player_id">Favorite Player ID</label>
              <input 
                type="number" 
                id="favorite_player_id" 
                bind:value={formData.favorite_player_id}
                placeholder="Sleeper Player ID"
              />
              <small>Find player IDs at api.sleeper.app/v1/players/nfl</small>
            </div>
          </div>
        </div>

        <div class="formSection">
          <h3>Team Philosophy</h3>
          <div class="inputGroup">
            <label for="philosophy">Your Fantasy Philosophy</label>
            <textarea 
              id="philosophy" 
              bind:value={formData.philosophy}
              placeholder="Describe your team's strategy and approach..."
            ></textarea>
          </div>
          <div class="inputGroup">
            <label for="trading_scale">Trading Activity (1-10)</label>
            <div class="rangeValue">
              <input 
                type="range" 
                id="trading_scale" 
                bind:value={formData.trading_scale}
                min="1"
                max="10"
              />
              <span>{formData.trading_scale}</span>
            </div>
            <small>1 = Never trades, 10 = Always looking to deal</small>
          </div>
        </div>

        <div class="formSection">
          <h3>Rival & Contact</h3>
          <div class="formGrid">
            <div class="inputGroup">
              <label for="rival_name">Rival Name</label>
              <input 
                type="text" 
                id="rival_name" 
                bind:value={formData.rival_name}
                placeholder="Your rival's name"
              />
            </div>
            <div class="inputGroup">
              <label for="preferred_contact">Preferred Contact Method</label>
              <select id="preferred_contact" bind:value={formData.preferred_contact}>
                {#each contactMethods as method}
                  <option value={method}>{method || 'Select Method'}</option>
                {/each}
              </select>
            </div>
          </div>
        </div>

        <div class="buttonGroup">
          <Button 
            variant="raised" 
            type="submit"
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save Profile'}
          </Button>
        </div>
      </form>
    </div>
  {/if}
</div>
