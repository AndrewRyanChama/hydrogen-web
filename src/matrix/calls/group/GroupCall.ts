/*
Copyright 2022 The Matrix.org Foundation C.I.C.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

import {ObservableMap} from "../../../observable/map/ObservableMap";
import {Participant} from "./Participant";
import {LocalMedia} from "../LocalMedia";
import type {Track} from "../../../platform/types/MediaDevices";
import type {SignallingMessage, MGroupCallBase} from "../callEventTypes";
import type {Room} from "../../room/Room";
import type {StateEvent} from "../../storage/types";
import type {Platform} from "../../../platform/web/Platform";

export class GroupCall {
    private readonly participants: ObservableMap<string, Participant> = new ObservableMap();
    private localMedia?: Promise<LocalMedia>;

    constructor(
        private readonly ownUserId: string,
        private callEvent: StateEvent,
        private readonly room: Room,
        private readonly platform: Platform
    ) {

    }

    get id(): string { return this.callEvent.state_key; }

    async participate(tracks: Promise<Track[]>) {
        this.localMedia = tracks.then(tracks => LocalMedia.fromTracks(tracks));
        for (const [,participant] of this.participants) {
            participant.setLocalMedia(this.localMedia.then(localMedia => localMedia.clone()));
        }
        // send m.call.member state event

        // send invite to all participants that are < my userId
        for (const [,participant] of this.participants) {
            if (participant.userId < this.ownUserId) {
                participant.call();
            }
        }
    }

    updateCallEvent(callEvent: StateEvent) {
        this.callEvent = callEvent;
    }

    addParticipant(userId, memberCallInfo) {
        let participant = this.participants.get(userId);
        if (participant) {
            participant.updateCallInfo(memberCallInfo);
        } else {
            participant = new Participant(userId, source.device_id, this.localMedia?.clone(), this.webRTC);
            participant.updateCallInfo(memberCallInfo);
            this.participants.add(userId, participant);
        }
    }

    removeParticipant(userId) {

    }

    handleDeviceMessage(userId: string, senderDeviceId: string, message: SignallingMessage<MGroupCallBase>, log: ILogItem) {
        let participant = this.participants.get(userId);
        if (participant) {
            participant.handleIncomingSignallingMessage(message, senderDeviceId);
        }
    }

    get isTerminated(): boolean {
        return !!this.callEvent.content[CALL_TERMINATED];
    }
}
