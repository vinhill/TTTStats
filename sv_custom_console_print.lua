-- see https://api-docs.ttt2.neoxult.de/ for TTT2 API Documentation

--Variable if round is over
roundOver = true

--[[
	Returns the name of the entity which inflicted damage to a player

	Should only get called when the inflictor is NOT a player

	RETURN example:
	"Entity [0][worldspawn]"
]]
function InflictorStr(infl)
	if IsValid(infl) then
		return tostring(infl) .. ", " .. infl:GetName()
	else
		return tostring(infl)
	end
end

--[[
	Returns info of the player which inflicted damage to a player or refers to the Method InflictorStr if the attacker is no player	

	RETURN example:
	"GhastM4n [executioner, traitors] <Weapon [1483][weapon_zm_rifle]>, (Player [2][GhastM4n], GhastM4n)"
	"Zumoari [hidden, hiddens] <Weapon [15][weapon_ttt_hd_knife]>, (Player [1][Zumoari], Zumoari)"
]]
function AttackerStr(att, infl)
	if att:IsPlayer() then
		--if att:GetRoleString() == "jester" then return end
		return PlayerStr(att) .. "<" .. tostring(att:GetActiveWeapon()) .. ">, (" .. InflictorStr(infl) .. ")"
	else
		return "nonplayer (" .. InflictorStr(infl) ..")"
	end
end

--[[
	Returns Info of a player

	RETURN example:
	"Zumoari [hidden, hiddens]"
]]
function PlayerStr(ply)
	if ply:IsPlayer() then
		return ply:Nick() .. " [" .. ply:GetRoleString() ..  ", " .. ply:GetTeam() .. "] "
	end
end

--[[
	Returns the DamageType as String
]]
function DamageStr(dmginfo)
	if dmginfo:IsFallDamage() then
		return "FALL"
	elseif dmginfo:IsBulletDamage() then
		return "BULLET"
	elseif dmginfo:IsExplosionDamage() then	
		return "EXPL"
	else
		return "OTHER<" .. dmginfo:GetDamageType() .. ">"
	end	
end

--[[
	Retunrs information of the victim. Is only to be called if the victim is a player!
]]
function VictimStr(ent)
	return PlayerStr(ent)
end

--[[
	Gets called when prepare started
	Returns map name and round state
]]
hook.Add("TTTPrepareRound", "CP_prep", function()
	PrintMessage(HUD_PRINTCONSOLE, "CP round state: prep")
	PrintMessage(HUD_PRINTCONSOLE, "CP map: " .. game.GetMap())
end)

--[[
	Gets called when game started
	Returns round state
]]
hook.Add("TTTBeginRound", "CP_active", function()
	PrintMessage(HUD_PRINTCONSOLE, "CP round state: active")
end)

--[[
	Gets called when game ended
	Returns round state
]]
hook.Add("TTTEndRound", "CP_post", function()
	PrintMessage(HUD_PRINTCONSOLE, "CP round state: post")
end)

--[[
	Gets called when the round starts:
	Returns Name and Role and Team of each player
]]
hook.Add("TTTBeginRound", "CP_round_start_role_print", function()
	for i, v in ipairs( player.GetAll() ) do
		DamageLog( "ROUND_START: " .. PlayerStr(v))
	end
	roundOver = false
end)

--[[
	Gets called when a player takes damage
	Returns:
	- Prefix: "CP_DMG"
	- DamageType: for list of damage types see Function DamageStr
	- Attacker Info: see AttackerStr
	- Victim Info: see VictimStr
	- Damage Amount
]]
hook.Add( "PlayerTakeDamage", "CP_player_damaged", function(ent, infl, att, amount, dmginfo)
	if not ent:IsPlayer() or roundOver then return end
			
	DamageLog( "CP_DMG " .. DamageStr(dmginfo) .. ": " .. AttackerStr(att, infl) .. " damaged " .. VictimStr(ent) .. " for " .. tostring(amount))
end)

--[[
	Gets called on player death
	Return is similar to hook playertakedamage, except:
	- Prefix: "CP_KILL"
	- no damage amount
]]
hook.Add( "PlayerDeath", "CP_player_death", function(ent, infl, att)
	--if ent.GetRoleString ~= "cursed" then return end --Dont print when player is cursed
	if not ent:IsPlayer() or roundOver then return end

	DamageLog( "CP_KILL: " .. AttackerStr(att, infl) .. " killed " .. VictimStr(ent) )
end)

--[[
	Gets called when a player orders equipment in a shop
]]
hook.Add("TTTOrderedEquipment", "CP_order_equipment", function(ply, equipment, is_item)
	local item_name = ""
	if is_item then
		item_name = GetEquipmentItem(ply:GetRole(), equipment).name
	else
		item_name = equipment
	end
	DamageLog( "CP_OE: " .. PlayerStr(ply) .. " ordered " .. item_name)
end)

--[[
	Gets called on Round End
]]
hook.Add("TTTEndRound", "CP_round_end_role_print", function()
	DamageLog( "ROUND_ENDED at given time")
	for i, v in ipairs( player.GetAll() ) do
    		DamageLog( "ROUND_END: " .. v:Nick() .. " was " .. v:GetRoleString() .. " team " .. v:GetTeam())
	end
	roundOver = true
end)

--[[
	Gets called when a palyer changes his role
]]
hook.Add("TTT2UpdateBaserole", "CP_update_baserole", function(ply, oldBaserole, newBaserole)
	if not transition and roundOver ~= true then
		DamageLog( "CP_RC: " .. PlayerStr(ply) .. "changed Role from [" .. roles.GetByIndex(oldBaserole).name .. "] to [" .. roles.GetByIndex(newBaserole).name .. "]")
	end
end)

--[[
	Gets called when a player changes the team
]]
hook.Add("TTT2UpdateTeam", "CP_update_team", function(ply, oldTeam, newTeam)
	if not transition and roundOver ~= true then
		DamageLog( "CP_TC: " .. PlayerStr(ply) .. "changed Team from [" .. oldTeam .. "] to [" .. newTeam .. "]")
	end
end)


--[[
	Considerations with each role:

	when evaluating the results the followling logic has to be implemented:

	Role-Independent:
	- Clear console.log of every line that does not contain:
		- "ROUND_START"
		- "CP_DMG"
		- "CP_KILL"
		- "CP_OE"
		- "CP_RC"
		- "CP_TC"
		- "ROUND_END"
	
	- often TTT2UpdateBaserole and TTT2UpdateTeam is called together (exceptions are explained further down)
	- the call to PlayerStr in TTT2UpdateBaserole and TTT2UpdateTeam already referes to the new role of the player

	Syntax: Name [Role, Team]

	Banker [banker, innocents]:
	- is a detective (same for Sniffer, Sherrif, Detective, Revolutionary)

	Beacon [beacon, innocents]:

	Blight [blight, traitors]:
	- does damage to players after his death
	- unknown how the program handles this

	Vampire [vampire, traitors]:
	- worlddamage for bloodlust should be ignored "CP_DMG OTHER<0>: nonplayer (Entity [0][worldspawn]) damaged Poci [vampire, traitors] for 1"

	Unknown [unknown, nones]:
	- kill should be ignored since its his task to getz himself killed (comes back in the team of the killer)

	Jester [jester, jesters]:
	- kill should be ignored since he wins with the kill

	Bodyguard [bodyguard, -changes teams- ]:
	- maybe we should add a variable which tracks how often the bodyguard is not able to keep his target alive

	Shinigami [shinigami, innocents]:
	- second death should not count 

	Cursed [cursed, nones]:
	- Kill wont be printed (see code above)

	Doppelganger [doppelganger, doppelgangers]:
	- Rolechange might not affect team (exceptions MAY be: Cursed, Lovers, Amnesiac)
]]