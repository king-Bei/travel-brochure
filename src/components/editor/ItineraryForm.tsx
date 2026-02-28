import React, { useCallback } from 'react';
import { useBrochure } from '../../context/BrochureContext';
import { useDropzone } from 'react-dropzone';
import { MapPin, Trash2, Upload } from 'lucide-react';

export function ItineraryForm() {
  const { data, updateData } = useBrochure();

  const updateItinerary = (index: number, field: string, value: any) => {
    const newItineraries = [...data.itineraries];
    newItineraries[index] = { ...newItineraries[index], [field]: value };
    updateData({ itineraries: newItineraries });
  };

  const toggleMeal = (index: number, meal: 'breakfast' | 'lunch' | 'dinner') => {
    const newItineraries = [...data.itineraries];
    newItineraries[index].meals = {
      ...newItineraries[index].meals,
      [meal]: !newItineraries[index].meals[meal],
    };
    updateData({ itineraries: newItineraries });
  };

  const onDrop = useCallback((index: number, acceptedFiles: File[]) => {
    const files = acceptedFiles.slice(0, 3 - data.itineraries[index].images.length);
    const newImages: string[] = [];
    
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = () => {
        newImages.push(reader.result as string);
        if (newImages.length === files.length) {
          const newItineraries = [...data.itineraries];
          newItineraries[index].images = [
            ...newItineraries[index].images,
            ...newImages
          ].slice(0, 3);
          updateData({ itineraries: newItineraries });
        }
      };
      reader.readAsDataURL(file);
    });
  }, [data.itineraries, updateData]);

  const removeImage = (itineraryIndex: number, imageIndex: number) => {
    const newItineraries = [...data.itineraries];
    newItineraries[itineraryIndex].images = newItineraries[itineraryIndex].images.filter(
      (_, i) => i !== imageIndex
    );
    updateData({ itineraries: newItineraries });
  };

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-lg flex items-center gap-2" style={{ color: data.theme.primary }}>
        <MapPin size={20} />
        行程介紹
      </h3>

      <div className="space-y-6">
        {data.itineraries.map((day, index) => {
          const { getRootProps, getInputProps, isDragActive } = useDropzone({
            onDrop: (files) => onDrop(index, files),
            accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'] },
            maxFiles: 3 - day.images.length,
          });

          return (
            <div key={index} className="p-4 border rounded-lg">
              <h4 className="font-medium mb-3" style={{ color: data.theme.primary }}>
                {day.title}
              </h4>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">標題</label>
                  <input
                    type="text"
                    value={day.title}
                    onChange={(e) => updateItinerary(index, 'title', e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                    placeholder={`第 ${index + 1} 天`}
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-600 mb-1">行程描述</label>
                  <textarea
                    value={day.description}
                    onChange={(e) => updateItinerary(index, 'description', e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                    rows={3}
                    placeholder="描述今天的行程內容..."
                  />
                </div>

                {/* Meals */}
                <div>
                  <label className="block text-xs text-gray-600 mb-2">餐食安排</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-1 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={day.meals.breakfast}
                        onChange={() => toggleMeal(index, 'breakfast')}
                        className="rounded"
                      />
                      早餐
                    </label>
                    <label className="flex items-center gap-1 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={day.meals.lunch}
                        onChange={() => toggleMeal(index, 'lunch')}
                        className="rounded"
                      />
                      午餐
                    </label>
                    <label className="flex items-center gap-1 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={day.meals.dinner}
                        onChange={() => toggleMeal(index, 'dinner')}
                        className="rounded"
                      />
                      晚餐
                    </label>
                  </div>
                </div>

                {/* Images */}
                <div>
                  <label className="block text-xs text-gray-600 mb-1">
                    圖片（最多 3 張）
                  </label>
                  
                  {day.images.length > 0 && (
                    <div className="grid grid-cols-3 gap-2 mb-2">
                      {day.images.map((img, imgIndex) => (
                        <div key={imgIndex} className="relative">
                          <img
                            src={img}
                            alt={`Day ${index + 1} image ${imgIndex + 1}`}
                            className="w-full h-20 object-cover rounded"
                          />
                          <button
                            onClick={() => removeImage(index, imgIndex)}
                            className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {day.images.length < 3 && (
                    <div
                      {...getRootProps()}
                      className={`border-2 border-dashed rounded-lg p-3 text-center cursor-pointer ${
                        isDragActive ? 'border-blue-400' : 'border-gray-300'
                      }`}
                    >
                      <input {...getInputProps()} />
                      <Upload size={16} className="mx-auto mb-1 text-gray-400" />
                      <p className="text-xs text-gray-500">點擊或拖曳上傳</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
