import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { 
  X, Search, Users, Globe, Heart, Clock, Sparkles, Eye, Download, 
  ArrowUpRight, Loader2, ChevronDown
} from 'lucide-react';
import { CharacterService, Character } from '@/lib/characters';
import { toast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface CharacterHubModalProps {
  open: boolean;
  onClose: () => void;
  onAdoptCharacter: (character: Character) => void;
}

export const CharacterHubModal: React.FC<CharacterHubModalProps> = ({ 
  open, 
  onClose, 
  onAdoptCharacter 
}) => {
  const [publicCharacters, setPublicCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);
  const [adoptingCharacter, setAdoptingCharacter] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [currentOffset, setCurrentOffset] = useState(0);
  const [isSearching, setIsSearching] = useState(false);

  const ITEMS_PER_PAGE = 10;

  // Load public characters
  useEffect(() => {
    if (open) {
      resetAndLoadCharacters();
    }
  }, [open]);

  // Handle search with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.trim()) {
        handleSearch();
      } else {
        resetAndLoadCharacters();
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const resetAndLoadCharacters = async () => {
    try {
      setLoading(true);
      setPublicCharacters([]);
      setCurrentOffset(0);
      setIsSearching(false);
      const characters = await CharacterService.getPublicCharacters(ITEMS_PER_PAGE, 0);
      setPublicCharacters(characters);
      setHasMore(characters.length === ITEMS_PER_PAGE);
    } catch (error) {
      console.error('Error loading public characters:', error);
      toast({
        title: "Error",
        description: "Failed to load public characters. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    try {
      setLoading(true);
      setPublicCharacters([]);
      setCurrentOffset(0);
      setIsSearching(true);
      const characters = await CharacterService.searchPublicCharacters(searchQuery.trim(), ITEMS_PER_PAGE, 0);
      setPublicCharacters(characters);
      setHasMore(characters.length === ITEMS_PER_PAGE);
    } catch (error) {
      console.error('Error searching characters:', error);
      toast({
        title: "Error",
        description: "Failed to search characters. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadMoreCharacters = async () => {
    if (loadingMore || !hasMore) return;

    try {
      setLoadingMore(true);
      const newOffset = currentOffset + ITEMS_PER_PAGE;
      
      const newCharacters = isSearching 
        ? await CharacterService.searchPublicCharacters(searchQuery.trim(), ITEMS_PER_PAGE, newOffset)
        : await CharacterService.getPublicCharacters(ITEMS_PER_PAGE, newOffset);
      
      setPublicCharacters(prev => [...prev, ...newCharacters]);
      setCurrentOffset(newOffset);
      setHasMore(newCharacters.length === ITEMS_PER_PAGE);
    } catch (error) {
      console.error('Error loading more characters:', error);
      toast({
        title: "Error",
        description: "Failed to load more characters. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoadingMore(false);
    }
  };

  // Characters are already filtered by the search API call

  const handleAdoptCharacter = async (character: Character) => {
    try {
      setAdoptingCharacter(character.id);
      
      // Save a reference to the original character instead of creating a copy
      await CharacterService.saveCharacterReference(character.id);
      
      onAdoptCharacter(character);
      
      toast({
        title: "Character Adopted!",
        description: `${character.name} has been added to your characters.`,
      });
      
      onClose();
    } catch (error) {
      console.error('Error adopting character:', error);
      toast({
        title: "Error",
        description: "Failed to adopt character. Please try again.",
        variant: "destructive",
      });
    } finally {
      setAdoptingCharacter(null);
    }
  };

  const handleClose = () => {
    setSelectedCharacter(null);
    setSearchQuery('');
    setPublicCharacters([]);
    setCurrentOffset(0);
    setHasMore(true);
    setIsSearching(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-6xl h-[85vh] p-0">
        <DialogHeader className="px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-xl font-semibold">Character Hub</DialogTitle>
              <DialogDescription>
                Discover and adopt amazing characters created by the community
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Search */}
        <div className="px-6 pb-4 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search characters by name, description, or skills..."
              className="pl-9 pr-4"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSearchQuery('')}
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0"
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Characters List */}
          <div className="flex-1 border-r">
            <div className="px-4 py-1">

              <ScrollArea className="h-[calc(85vh-200px)] scrollbar-hide">
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="flex flex-col items-center gap-3">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      <p className="text-sm text-muted-foreground">Loading characters...</p>
                    </div>
                  </div>
                ) : publicCharacters.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Globe className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="font-medium text-lg mb-2">
                      {searchQuery.trim() ? 'No characters found' : 'No public characters yet'}
                    </h3>
                    <p className="text-sm text-muted-foreground max-w-sm">
                      {searchQuery.trim() 
                        ? 'Try adjusting your search terms or browse all available characters.' 
                        : 'Be the first to share an amazing character with the community!'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {publicCharacters.map((character) => (
                      <Card 
                        key={character.id}
                        className={`cursor-pointer transition-colors hover:bg-muted/50 ${
                          selectedCharacter?.id === character.id ? 'bg-muted border-primary' : ''
                        }`}
                        onClick={() => setSelectedCharacter(character)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <div className="text-2xl">{character.emoji}</div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-medium truncate">{character.name}</h4>
                                <Badge variant="secondary" className="text-xs">
                                  <Globe className="h-3 w-3 mr-1" />
                                  Public
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                                {character.description}
                              </p>
                              <div className="flex items-center gap-1 flex-wrap">
                                {character.skills.slice(0, 3).map((skill) => (
                                  <Badge key={skill} variant="outline" className="text-xs">
                                    {skill}
                                  </Badge>
                                ))}
                                {character.skills.length > 3 && (
                                  <Badge variant="outline" className="text-xs">
                                    +{character.skills.length - 3}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                    
                    {/* Load More Button */}
                    {hasMore && (
                      <div className="flex justify-center pt-4">
                        <Button
                          variant="outline"
                          onClick={loadMoreCharacters}
                          disabled={loadingMore}
                          className="w-full"
                        >
                          {loadingMore ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin mr-2" />
                              Loading more...
                            </>
                          ) : (
                            <>
                              <ChevronDown className="w-4 h-4 mr-2" />
                              Load More Characters
                            </>
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </ScrollArea>
            </div>
          </div>

          {/* Character Details */}
          <div className="w-96 border-l bg-muted/20">
            {selectedCharacter ? (
              <div className="p-6 h-full overflow-y-auto scrollbar-hide">
                {/* Character Header */}
                <div className="text-center mb-6">
                  <div className="text-4xl mb-3">{selectedCharacter.emoji}</div>
                  <h3 className="text-xl font-semibold mb-2">{selectedCharacter.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedCharacter.description}
                  </p>
                </div>

                <Separator className="my-6" />

                <div className="space-y-6">
                  {/* Personality Section */}
                  <div>
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      <Heart className="h-4 w-4 text-primary" />
                      Personality
                    </h4>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Voice Tone:</span>
                        <Badge variant="secondary" className="capitalize">
                          {selectedCharacter.voice_tone}
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Mood:</span>
                        <Badge variant="secondary" className="capitalize">
                          {selectedCharacter.mood}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* Skills Section */}
                  <div>
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-primary" />
                      Skills
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedCharacter.skills.map((skill) => (
                        <Badge key={skill} variant="outline" className="text-xs">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Meta Information */}
                  <div>
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      <Clock className="h-4 w-4 text-primary" />
                      Information
                    </h4>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">Created:</span>
                        <span>
                          {new Date(selectedCharacter.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">Status:</span>
                        <Badge variant="outline" className="text-xs">
                          <Globe className="h-3 w-3 mr-1" />
                          Public
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Adopt Button */}
                <div className="mt-8">
                  <Button
                    className="w-full"
                    onClick={() => handleAdoptCharacter(selectedCharacter)}
                    disabled={adoptingCharacter === selectedCharacter.id}
                  >
                    {adoptingCharacter === selectedCharacter.id ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        Adopting...
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4 mr-2" />
                        Adopt Character
                      </>
                    )}
                  </Button>
                  <p className="text-xs text-muted-foreground text-center mt-3">
                    This will create a private copy of this character for you
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                <Eye className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="font-medium mb-2">Select a character</h3>
                <p className="text-sm text-muted-foreground">
                  Choose a character from the list to view details and adopt them
                </p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}; 